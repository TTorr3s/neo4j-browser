/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import deepmerge from 'deepmerge'
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'

import { Graph } from './Graph/Graph'
import { NodeInspectorPanel, defaultPanelWidth } from './NodeInspectorPanel'
import { StyledFullSizeContainer, panelMinWidth } from './styled'
import {
  BasicNode,
  BasicNodesAndRels,
  BasicRelationship,
  deepEquals
} from 'neo4j-arc/common'
import { DetailsPaneProps } from './DefaultPanelContent/DefaultDetailsPane'
import { OverviewPaneProps } from './DefaultPanelContent/DefaultOverviewPane'
import { GraphStyleModel } from '../models/GraphStyle'
import { GetNodeNeighboursFn, VizItem } from '../types'
import { GraphStats } from '../utils/mapper'
import { GraphModel } from '../models/Graph'
import { GraphInteractionCallBack } from './Graph/GraphEventHandlerModel'

const DEFAULT_MAX_NEIGHBOURS = 100
const HOVER_DEBOUNCE_MS = 200

type GraphVisualizerProps = {
  relationships: BasicRelationship[]
  nodes: BasicNode[]
  maxNeighbours?: number
  graphStyleData?: any
  getNeighbours?: (
    id: string,
    currentNeighbourIds: string[] | undefined
  ) => Promise<BasicNodesAndRels & { allNeighboursCount: number }>
  updateStyle?: (style: any) => void
  isFullscreen?: boolean
  assignVisElement?: (svgElement: any, graphElement: any) => void
  getAutoCompleteCallback?: (
    callback: (rels: BasicRelationship[], initialRun: boolean) => void
  ) => void
  setGraph?: (graph: GraphModel) => void
  hasTruncatedFields?: boolean
  nodeLimitHit?: boolean
  nodePropertiesExpandedByDefault?: boolean
  setNodePropertiesExpandedByDefault?: (expandedByDefault: boolean) => void
  wheelZoomRequiresModKey?: boolean
  wheelZoomInfoMessageEnabled?: boolean
  disableWheelZoomInfoMessage?: () => void
  DetailsPaneOverride?: React.FC<DetailsPaneProps>
  OverviewPaneOverride?: React.FC<OverviewPaneProps>
  onGraphInteraction?: GraphInteractionCallBack
  useGeneratedDefaultColors?: boolean
  autocompleteRelationships: boolean
  initialZoomToFit?: boolean
}

export function GraphVisualizer({
  relationships: propRelationships,
  nodes: propNodes,
  maxNeighbours = DEFAULT_MAX_NEIGHBOURS,
  graphStyleData,
  getNeighbours,
  updateStyle = () => undefined,
  isFullscreen = false,
  assignVisElement = () => undefined,
  getAutoCompleteCallback = () => undefined,
  setGraph = () => undefined,
  hasTruncatedFields = false,
  nodeLimitHit,
  nodePropertiesExpandedByDefault = true,
  setNodePropertiesExpandedByDefault = () => undefined,
  wheelZoomRequiresModKey,
  wheelZoomInfoMessageEnabled = false,
  disableWheelZoomInfoMessage = () => undefined,
  DetailsPaneOverride,
  OverviewPaneOverride,
  onGraphInteraction,
  useGeneratedDefaultColors = true,
  autocompleteRelationships,
  initialZoomToFit
}: GraphVisualizerProps): JSX.Element {
  // Create graphStyle and defaultStyle only once on mount
  const graphStyleRef = useRef<GraphStyleModel | null>(null)
  const defaultStyleRef = useRef<any>(null)

  if (graphStyleRef.current === null) {
    graphStyleRef.current = new GraphStyleModel(useGeneratedDefaultColors)
    defaultStyleRef.current = graphStyleRef.current.toSheet()

    // Apply initial graphStyleData if present
    if (graphStyleData) {
      const rebasedStyle = deepmerge(defaultStyleRef.current, graphStyleData)
      graphStyleRef.current.loadRules(rebasedStyle)
    }
  }

  // Compute initial selectedItem
  const initialSelectedItem = useMemo((): VizItem => {
    if (nodeLimitHit) {
      return {
        type: 'status-item',
        item: `Not all return nodes are being displayed due to Initial Node Display setting. Only first ${propNodes.length} nodes are displayed.`
      }
    }
    return {
      type: 'canvas',
      item: {
        nodeCount: propNodes.length,
        relationshipCount: propRelationships.length
      }
    }
    // Only compute on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // State
  const [stats, setStats] = useState<GraphStats>({ labels: {}, relTypes: {} })
  const [styleVersion, setStyleVersion] = useState(0)
  const [nodes] = useState<BasicNode[]>(propNodes)
  const [relationships] = useState<BasicRelationship[]>(propRelationships)
  const [selectedItem, setSelectedItem] = useState<VizItem>(initialSelectedItem)
  const [hoveredItem, setHoveredItem] = useState<VizItem>(initialSelectedItem)
  const [freezeLegend, setFreezeLegend] = useState(false)
  const [width, setWidth] = useState(defaultPanelWidth())
  const [nodePropertiesExpanded, setNodePropertiesExpanded] = useState(
    nodePropertiesExpandedByDefault
  )

  // Ref for tracking mount state (used in debounced hover)
  const mountedRef = useRef(true)
  const hoverDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Track previous graphStyleData for comparison
  const prevGraphStyleDataRef = useRef<any>(graphStyleData)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (hoverDebounceRef.current) {
        clearTimeout(hoverDebounceRef.current)
      }
    }
  }, [])

  // Handle graphStyleData changes (equivalent to componentDidUpdate logic)
  useEffect(() => {
    if (!deepEquals(prevGraphStyleDataRef.current, graphStyleData)) {
      if (graphStyleData) {
        const rebasedStyle = deepmerge(defaultStyleRef.current, graphStyleData)
        graphStyleRef.current!.loadRules(rebasedStyle)
        setStyleVersion(v => v + 1)
      } else {
        graphStyleRef.current!.resetToDefault()
        setFreezeLegend(true)
        // Use setTimeout to batch state updates similar to setState callback
        setTimeout(() => {
          setFreezeLegend(false)
          updateStyle(graphStyleRef.current!.toSheet())
        }, 0)
      }
      prevGraphStyleDataRef.current = graphStyleData
    }
  }, [graphStyleData, updateStyle])

  // Debounced hover handler
  const debouncedSetHoveredItem = useCallback((item: VizItem) => {
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current)
    }
    hoverDebounceRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setHoveredItem(item)
      }
    }, HOVER_DEBOUNCE_MS)
  }, [])

  // Event handlers
  const onItemMouseOver = useCallback(
    (item: VizItem): void => {
      debouncedSetHoveredItem(item)
    },
    [debouncedSetHoveredItem]
  )

  const onItemSelect = useCallback((item: VizItem): void => {
    setSelectedItem(item)
  }, [])

  const onGraphModelChange = useCallback(
    (newStats: GraphStats): void => {
      setStats(newStats)
      updateStyle(graphStyleRef.current!.toSheet())
    },
    [updateStyle]
  )

  const getNodeNeighbours: GetNodeNeighboursFn = useCallback(
    (node, currentNeighbourIds, callback) => {
      if (currentNeighbourIds.length > maxNeighbours) {
        callback({ nodes: [], relationships: [] })
        return
      }
      if (getNeighbours) {
        getNeighbours(node.id, currentNeighbourIds).then(
          ({ nodes: newNodes, relationships: newRels, allNeighboursCount }) => {
            if (allNeighboursCount > maxNeighbours) {
              setSelectedItem({
                type: 'status-item',
                item: `Rendering was limited to ${maxNeighbours} of the node's total ${allNeighboursCount} neighbours due to browser config maxNeighbours.`
              })
            }
            callback({ nodes: newNodes, relationships: newRels })
          },
          () => {
            callback({ nodes: [], relationships: [] })
          }
        )
      }
    },
    [getNeighbours, maxNeighbours]
  )

  const handleSetWidth = useCallback((newWidth: number) => {
    setWidth(Math.max(panelMinWidth, newWidth))
  }, [])

  const toggleExpanded = useCallback(() => {
    setNodePropertiesExpanded(prev => {
      setNodePropertiesExpandedByDefault(!prev)
      return !prev
    })
  }, [setNodePropertiesExpandedByDefault])

  // This is a workaround to make the style reset to the same colors as when starting the browser with an empty style
  // If the legend component has the style it will ask the neoGraphStyle object for styling before the graph component,
  // and also doing this in a different order from the graph. This leads to different default colors being assigned to different labels.
  const graphStyle = freezeLegend
    ? new GraphStyleModel(useGeneratedDefaultColors)
    : graphStyleRef.current!

  return (
    <StyledFullSizeContainer id="svg-vis">
      <Graph
        isFullscreen={isFullscreen}
        relationships={relationships}
        nodes={nodes}
        getNodeNeighbours={getNodeNeighbours}
        onItemMouseOver={onItemMouseOver}
        onItemSelect={onItemSelect}
        graphStyle={graphStyle}
        styleVersion={styleVersion}
        onGraphModelChange={onGraphModelChange}
        assignVisElement={assignVisElement}
        getAutoCompleteCallback={getAutoCompleteCallback}
        autocompleteRelationships={autocompleteRelationships}
        setGraph={setGraph}
        offset={(nodePropertiesExpanded ? width + 8 : 0) + 8}
        wheelZoomRequiresModKey={wheelZoomRequiresModKey}
        wheelZoomInfoMessageEnabled={wheelZoomInfoMessageEnabled}
        disableWheelZoomInfoMessage={disableWheelZoomInfoMessage}
        initialZoomToFit={initialZoomToFit}
        onGraphInteraction={onGraphInteraction}
      />
      <NodeInspectorPanel
        graphStyle={graphStyle}
        hasTruncatedFields={hasTruncatedFields}
        hoveredItem={hoveredItem}
        selectedItem={selectedItem}
        stats={stats}
        width={width}
        setWidth={handleSetWidth}
        expanded={nodePropertiesExpanded}
        toggleExpanded={toggleExpanded}
        DetailsPaneOverride={DetailsPaneOverride}
        OverviewPaneOverride={OverviewPaneOverride}
      />
    </StyledFullSizeContainer>
  )
}
