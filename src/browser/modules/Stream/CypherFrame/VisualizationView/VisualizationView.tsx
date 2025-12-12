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
import neo4j from 'neo4j-driver'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { connect } from 'react-redux'
import { withBus } from 'react-suber'
import { Action, Dispatch } from 'redux'
import { Bus } from 'suber'

import {
  BasicNode,
  BasicNodesAndRels,
  BasicRelationship,
  deepEquals
} from 'neo4j-arc/common'
import { GraphModel, GraphVisualizer } from 'neo4j-arc/graph-visualization'

import { DetailsPane } from './PropertiesPanelContent/DetailsPane'
import OverviewPane from './PropertiesPanelContent/OverviewPane'
import { StyledVisContainer } from './VisualizationView.styled'
import { resultHasTruncatedFields } from 'browser/modules/Stream/CypherFrame/helpers'
import bolt from 'services/bolt/bolt'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import { GlobalState } from 'shared/globalState'
import { ROUTED_CYPHER_READ_REQUEST } from 'shared/modules/cypher/cypherDuck'
import {
  getNodePropertiesExpandedByDefault,
  setNodePropertiesExpandedByDefault
} from 'shared/modules/frames/framesDuck'
import * as grassActions from 'shared/modules/grass/grassDuck'
import {
  getMaxFieldItems,
  shouldShowWheelZoomInfo,
  update as updateSettings
} from 'shared/modules/settings/settingsDuck'

type VisualizationState = {
  updated: number
  nodes: BasicNode[]
  relationships: BasicRelationship[]
  hasTruncatedFields: boolean
  nodeLimitHit: boolean
}

export type VisualizationProps = {
  result: any
  graphStyleData: any
  updated: number
  autoComplete: boolean
  maxNeighbours: number
  bus: Bus
  maxFieldItems: number
  initialNodeDisplay: number
  isFullscreen: boolean
  updateStyle: (style: any) => void
  assignVisElement: (v: any) => void
  nodePropertiesExpandedByDefault: boolean
  setNodePropertiesExpandedByDefault: (expandedByDefault: boolean) => void
  wheelZoomInfoMessageEnabled: boolean
  disableWheelZoomInfoMessage: () => void
}

type AutoCompleteCallback = (
  rels: BasicRelationship[],
  initialRun: boolean
) => void

const initialState: VisualizationState = {
  nodes: [],
  relationships: [],
  updated: 0,
  nodeLimitHit: false,
  hasTruncatedFields: false
}

function VisualizationComponent(
  props: VisualizationProps
): React.ReactElement<any> | null {
  const {
    result,
    graphStyleData,
    updated,
    autoComplete,
    maxNeighbours,
    bus,
    maxFieldItems,
    initialNodeDisplay,
    isFullscreen,
    updateStyle,
    assignVisElement,
    nodePropertiesExpandedByDefault,
    setNodePropertiesExpandedByDefault,
    wheelZoomInfoMessageEnabled,
    disableWheelZoomInfoMessage
  } = props

  const [state, setState] = useState<VisualizationState>(initialState)

  // Refs for instance properties
  const autoCompleteCallbackRef = useRef<AutoCompleteCallback | null>(null)
  const graphRef = useRef<GraphModel | null>(null)

  // populateDataToStateFromProps - extracts nodes and relationships from result
  const populateDataToStateFromProps = useCallback(() => {
    const { nodes, relationships } =
      bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
        result.records,
        true,
        maxFieldItems
      )

    const { nodes: uniqNodes, nodeLimitHit } = deduplicateNodes(
      nodes,
      initialNodeDisplay
    )

    const uniqRels = nodeLimitHit
      ? relationships.filter(
          rel =>
            !!uniqNodes.find(node => node.id === rel.startNodeId) &&
            !!uniqNodes.find(node => node.id === rel.endNodeId)
        )
      : relationships

    const hasTruncatedFields = resultHasTruncatedFields(result, maxFieldItems)
    setState({
      nodes: uniqNodes,
      relationships: uniqRels,
      nodeLimitHit,
      hasTruncatedFields,
      updated: new Date().getTime()
    })
  }, [result, maxFieldItems, initialNodeDisplay])

  // getInternalRelationships - fetches relationships between existing and new nodes
  const getInternalRelationships = useCallback(
    (
      rawExistingNodeIds: number[],
      rawNewNodeIds: number[]
    ): Promise<BasicNodesAndRels> => {
      const newNodeIds = rawNewNodeIds.map(n => neo4j.int(n))
      const existingNodeIds = rawExistingNodeIds
        .map(n => neo4j.int(n))
        .concat(newNodeIds)
      const query =
        'MATCH (a)-[r]->(b) WHERE id(a) IN $existingNodeIds AND id(b) IN $newNodeIds RETURN r;'
      return new Promise(resolve => {
        bus &&
          bus.self(
            ROUTED_CYPHER_READ_REQUEST,
            {
              query,
              params: { existingNodeIds, newNodeIds },
              queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
              useDb: result?.summary?.database?.name
            },
            (response: any) => {
              if (!response.success) {
                console.error(response.error)
                resolve({ nodes: [], relationships: [] })
              } else {
                resolve({
                  ...bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
                    response.result.records,
                    false,
                    maxFieldItems
                  )
                })
              }
            }
          )
      })
    },
    [bus, result?.summary?.database?.name, maxFieldItems]
  )

  // autoCompleteRelationships - fetches relationships for autocomplete
  const autoCompleteRelationships = useCallback(
    (
      existingNodes: { id: string }[],
      newNodes: { id: string }[],
      initialRun: boolean
    ): void => {
      if (autoComplete) {
        const existingNodeIds = existingNodes.map(node => parseInt(node.id))
        const newNodeIds = newNodes.map(node => parseInt(node.id))

        getInternalRelationships(existingNodeIds, newNodeIds).then(graph => {
          autoCompleteCallbackRef.current &&
            autoCompleteCallbackRef.current(graph.relationships, initialRun)
        })
      } else {
        autoCompleteCallbackRef.current &&
          autoCompleteCallbackRef.current([], initialRun)
      }
    },
    [autoComplete, getInternalRelationships]
  )

  // getNeighbours - fetches neighbour nodes for expansion
  const getNeighbours = useCallback(
    (
      id: string,
      currentNeighbourIds: string[] = []
    ): Promise<BasicNodesAndRels & { allNeighboursCount: number }> => {
      const maxNewNeighbours = maxNeighbours - currentNeighbourIds.length

      const query =
        maxNewNeighbours > 0
          ? `MATCH (a) WHERE id(a) = ${id}
WITH a, size([(a)--() | 1]) AS allNeighboursCount
MATCH path = (a)--(o) WHERE NOT id(o) IN [${currentNeighbourIds.join(',')}]
RETURN path, allNeighboursCount
ORDER BY id(o)
LIMIT ${maxNewNeighbours}`
          : `MATCH p=(a)--() WHERE id(a) = ${id} RETURN count(p) as allNeighboursCount`

      return new Promise((resolve, reject) => {
        bus &&
          bus.self(
            ROUTED_CYPHER_READ_REQUEST,
            {
              query: query,
              queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
              useDb: result?.summary?.database?.name
            },
            (response: any) => {
              if (!response.success) {
                reject(new Error())
              } else {
                const allNeighboursCount =
                  response.result.records.length > 0
                    ? parseInt(
                        response.result.records[0]
                          .get('allNeighboursCount')
                          .toString()
                      )
                    : 0
                const resultGraph =
                  bolt.extractNodesAndRelationshipsFromRecordsForOldVis(
                    response.result.records,
                    false,
                    maxFieldItems
                  )
                autoCompleteRelationships(
                  graphRef.current?.nodes() || [],
                  resultGraph.nodes,
                  false
                )
                resolve({ ...resultGraph, allNeighboursCount })
              }
            }
          )
      })
    },
    [
      maxNeighbours,
      bus,
      result?.summary?.database?.name,
      maxFieldItems,
      autoCompleteRelationships
    ]
  )

  // setGraph - stores graph reference and triggers initial autocomplete
  const setGraph = useCallback(
    (graph: GraphModel): void => {
      graphRef.current = graph
      autoCompleteRelationships([], graph.nodes(), true)
    },
    [autoCompleteRelationships]
  )

  // getAutoCompleteCallback - stores the autocomplete callback reference
  const getAutoCompleteCallback = useCallback(
    (callback: AutoCompleteCallback) => {
      autoCompleteCallbackRef.current = callback
    },
    []
  )

  // Effect for initial mount - populate data if records exist
  useEffect(() => {
    const { records = [] } = result
    if (records && records.length > 0) {
      populateDataToStateFromProps()
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect for updates - re-populate when updated or autoComplete changes
  useEffect(() => {
    // Skip the initial render - this handles componentDidUpdate logic
    populateDataToStateFromProps()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updated, autoComplete])

  if (!state.nodes.length) return null

  return (
    <StyledVisContainer isFullscreen={isFullscreen}>
      <GraphVisualizer
        // EXPERIMENTAL: renderer="webgl"
        maxNeighbours={maxNeighbours}
        hasTruncatedFields={state.hasTruncatedFields}
        graphStyleData={graphStyleData}
        updateStyle={updateStyle}
        getNeighbours={getNeighbours}
        nodes={state.nodes}
        autocompleteRelationships={autoComplete ?? false}
        relationships={state.relationships}
        isFullscreen={isFullscreen}
        assignVisElement={assignVisElement}
        nodeLimitHit={state.nodeLimitHit}
        getAutoCompleteCallback={getAutoCompleteCallback}
        setGraph={setGraph}
        setNodePropertiesExpandedByDefault={setNodePropertiesExpandedByDefault}
        nodePropertiesExpandedByDefault={nodePropertiesExpandedByDefault}
        wheelZoomRequiresModKey={!isFullscreen}
        wheelZoomInfoMessageEnabled={
          wheelZoomInfoMessageEnabled && !isFullscreen
        }
        disableWheelZoomInfoMessage={disableWheelZoomInfoMessage}
        DetailsPaneOverride={DetailsPane}
        OverviewPaneOverride={OverviewPane}
        useGeneratedDefaultColors={false}
        initialZoomToFit
      />
    </StyledVisContainer>
  )
}

// arePropsEqual for React.memo - returns true if props are equal (do NOT re-render)
// This is the inverse of shouldComponentUpdate which returns true to re-render
function arePropsEqual(
  prevProps: VisualizationProps,
  nextProps: VisualizationProps
): boolean {
  // Original shouldComponentUpdate returned true (re-render) when any of these were different
  // So we return false (do re-render) when any of these are different
  // Equivalently, return true (skip re-render) only when ALL are equal
  return (
    prevProps.updated === nextProps.updated &&
    prevProps.isFullscreen === nextProps.isFullscreen &&
    deepEquals(prevProps.graphStyleData, nextProps.graphStyleData) &&
    prevProps.autoComplete === nextProps.autoComplete &&
    prevProps.wheelZoomInfoMessageEnabled ===
      nextProps.wheelZoomInfoMessageEnabled
  )
}

export const Visualization = React.memo(VisualizationComponent, arePropsEqual)

const mapStateToProps = (state: GlobalState) => ({
  graphStyleData: grassActions.getGraphStyleData(state),
  maxFieldItems: getMaxFieldItems(state),
  nodePropertiesExpandedByDefault: getNodePropertiesExpandedByDefault(state),
  wheelZoomInfoMessageEnabled: shouldShowWheelZoomInfo(state)
})

const mapDispatchToProps = (dispatch: Dispatch<Action>) => ({
  disableWheelZoomInfoMessage: () => {
    dispatch(updateSettings({ showWheelZoomInfo: false }))
  },
  setNodePropertiesExpandedByDefault: (expandedByDefault: boolean) =>
    dispatch(setNodePropertiesExpandedByDefault(expandedByDefault)),
  updateStyle: (graphStyleData: any) => {
    dispatch(grassActions.updateGraphStyleData(graphStyleData))
  }
})

export const VisualizationConnectedBus = withBus(
  connect(mapStateToProps, mapDispatchToProps)(Visualization)
)

type DeduplicateHelper = {
  nodes: BasicNode[]
  taken: Record<string, boolean>
  nodeLimitHit: boolean
}

const deduplicateNodes = (
  nodes: BasicNode[],
  limit: number
): { nodes: BasicNode[]; nodeLimitHit: boolean } =>
  nodes.reduce(
    (all: DeduplicateHelper, curr: BasicNode) => {
      if (all.nodes.length === limit) {
        all.nodeLimitHit = true
      } else if (!all.taken[curr.id]) {
        all.nodes.push(curr)
        all.taken[curr.id] = true
      }
      return all
    },
    { nodes: [], taken: {}, nodeLimitHit: false }
  )
