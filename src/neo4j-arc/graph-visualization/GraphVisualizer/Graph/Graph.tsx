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
import { ResizeObserver } from '@juggle/resize-observer'
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import {
  BasicNode,
  BasicRelationship,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomToFitIcon
} from '../../../common'
import { GraphModel } from '../../models/Graph'
import { GraphStyleModel } from '../../models/GraphStyle'
import {
  GetNodeNeighboursFn,
  VizItem,
  ZoomLimitsReached,
  ZoomType
} from '../../types'
import {
  GraphStats,
  createGraph,
  getGraphStats,
  mapRelationships
} from '../../utils/mapper'
import {
  GraphEventHandlerModel,
  GraphInteractionCallBack
} from './GraphEventHandlerModel'
import { WheelZoomInfoOverlay } from './WheelZoomInfoOverlay'
import { StyledSvgWrapper, StyledZoomButton, StyledZoomHolder } from './styled'
import type { RenderEngine } from './visualization/RenderEngine'
import { SVGVisualization } from './visualization/SVGVisualization'

/**
 * Renderer type for graph visualization
 * - 'svg': D3-based SVG renderer (default, best compatibility)
 * - 'webgl': PixiJS WebGL renderer (experimental, better for large graphs)
 */
export type GraphRendererType = 'svg' | 'webgl'

export type GraphProps = {
  isFullscreen: boolean
  relationships: BasicRelationship[]
  nodes: BasicNode[]
  getNodeNeighbours: GetNodeNeighboursFn
  onItemMouseOver: (item: VizItem) => void
  onItemSelect: (item: VizItem) => void
  graphStyle: GraphStyleModel
  styleVersion: number
  onGraphModelChange: (stats: GraphStats) => void
  assignVisElement: (svgElement: any, graphElement: any) => void
  autocompleteRelationships: boolean
  getAutoCompleteCallback: (
    callback: (
      internalRelationships: BasicRelationship[],
      initialRun: boolean
    ) => void
  ) => void
  setGraph: (graph: GraphModel) => void
  offset: number
  wheelZoomRequiresModKey?: boolean
  wheelZoomInfoMessageEnabled?: boolean
  disableWheelZoomInfoMessage: () => void
  initialZoomToFit?: boolean
  onGraphInteraction?: GraphInteractionCallBack
  /**
   * Renderer type: 'svg' (default) or 'webgl' (experimental)
   * WebGL renderer is optimized for large graphs (5,000+ nodes)
   */
  renderer?: GraphRendererType
}

export function Graph({
  isFullscreen,
  relationships,
  nodes,
  getNodeNeighbours,
  onItemMouseOver,
  onItemSelect,
  graphStyle,
  styleVersion,
  onGraphModelChange,
  assignVisElement,
  autocompleteRelationships,
  getAutoCompleteCallback,
  setGraph,
  offset,
  wheelZoomRequiresModKey,
  wheelZoomInfoMessageEnabled,
  disableWheelZoomInfoMessage,
  initialZoomToFit,
  onGraphInteraction,
  renderer = 'svg'
}: GraphProps): JSX.Element {
  // State
  const [zoomInLimitReached, setZoomInLimitReached] = useState(false)
  const [zoomOutLimitReached, setZoomOutLimitReached] = useState(false)
  const [displayingWheelZoomInfoMessage, setDisplayingWheelZoomInfoMessage] =
    useState(false)

  // Refs
  const svgRef = useRef<SVGSVGElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const visualizationRef = useRef<RenderEngine | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Store current props in refs for use in callbacks that shouldn't trigger re-initialization
  const isFullscreenRef = useRef(isFullscreen)
  const wheelZoomRequiresModKeyRef = useRef(wheelZoomRequiresModKey)

  // Keep refs in sync with props
  useEffect(() => {
    isFullscreenRef.current = isFullscreen
  }, [isFullscreen])

  useEffect(() => {
    wheelZoomRequiresModKeyRef.current = wheelZoomRequiresModKey
  }, [wheelZoomRequiresModKey])

  // Zoom event handler
  const handleZoomEvent = useCallback((limitsReached: ZoomLimitsReached) => {
    setZoomInLimitReached(prev => {
      if (prev !== limitsReached.zoomInLimitReached) {
        return limitsReached.zoomInLimitReached
      }
      return prev
    })
    setZoomOutLimitReached(prev => {
      if (prev !== limitsReached.zoomOutLimitReached) {
        return limitsReached.zoomOutLimitReached
      }
      return prev
    })
  }, [])

  // Wheel zoom info message handler - uses refs to avoid stale closure
  const handleDisplayZoomWheelInfoMessage = useCallback(() => {
    setDisplayingWheelZoomInfoMessage(prev => {
      if (
        !prev &&
        wheelZoomRequiresModKeyRef.current &&
        wheelZoomInfoMessageEnabled
      ) {
        return true
      }
      return prev
    })
  }, [wheelZoomInfoMessageEnabled])

  // Zoom button handlers
  const zoomInClicked = useCallback(() => {
    visualizationRef.current?.zoomByType(ZoomType.IN)
  }, [])

  const zoomOutClicked = useCallback(() => {
    visualizationRef.current?.zoomByType(ZoomType.OUT)
  }, [])

  const zoomToFitClicked = useCallback(() => {
    visualizationRef.current?.zoomByType(ZoomType.FIT)
  }, [])

  // Visualization initialization (runs once on mount)
  useEffect(() => {
    if (!svgRef.current) return

    // TODO: WebGL renderer support (Phase 2-4)
    // When renderer === 'webgl', use PixiVisualization instead
    if (renderer === 'webgl') {
      console.warn(
        'WebGL renderer is experimental and not yet fully implemented. Falling back to SVG.'
      )
    }

    const svgElement = svgRef.current

    const measureSize = () => ({
      width: svgElement.parentElement?.clientWidth ?? 200,
      height: svgElement.parentElement?.clientHeight ?? 200
    })

    const graph = createGraph(nodes, relationships)
    const visualization = new SVGVisualization(
      svgElement,
      measureSize,
      handleZoomEvent,
      handleDisplayZoomWheelInfoMessage,
      graph,
      graphStyle,
      isFullscreen,
      wheelZoomRequiresModKey,
      initialZoomToFit
    )
    visualizationRef.current = visualization

    const graphEventHandler = new GraphEventHandlerModel(
      graph,
      visualization,
      getNodeNeighbours,
      onItemMouseOver,
      onItemSelect,
      onGraphModelChange,
      onGraphInteraction
    )
    graphEventHandler.bindEventHandlers()

    onGraphModelChange(getGraphStats(graph))
    visualization.resize(isFullscreen, !!wheelZoomRequiresModKey)

    if (setGraph) {
      setGraph(graph)
    }

    if (autocompleteRelationships) {
      getAutoCompleteCallback(
        (internalRelationships: BasicRelationship[], initialRun: boolean) => {
          if (initialRun) {
            visualization.init()
            graph.addInternalRelationships(
              mapRelationships(internalRelationships, graph)
            )
            onGraphModelChange(getGraphStats(graph))
            visualization.update({
              updateNodes: false,
              updateRelationships: true,
              restartSimulation: false
            })
            visualization.precomputeAndStart()
            graphEventHandler.onItemMouseOut()
          } else {
            graph.addInternalRelationships(
              mapRelationships(internalRelationships, graph)
            )
            onGraphModelChange(getGraphStats(graph))
            visualization.update({
              updateNodes: false,
              updateRelationships: true,
              restartSimulation: false
            })
          }
        }
      )
    } else {
      visualization.init()
      visualization.precomputeAndStart()
    }

    if (assignVisElement) {
      assignVisElement(svgElement, visualization)
    }

    // Setup ResizeObserver
    resizeObserverRef.current = new ResizeObserver(() => {
      visualizationRef.current?.resize(
        isFullscreenRef.current,
        !!wheelZoomRequiresModKeyRef.current
      )
    })
    resizeObserverRef.current.observe(svgElement)

    // Cleanup
    return () => {
      resizeObserverRef.current?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - dependencies are intentionally captured at mount time

  // Handle isFullscreen changes
  useEffect(() => {
    visualizationRef.current?.resize(isFullscreen, !!wheelZoomRequiresModKey)
  }, [isFullscreen, wheelZoomRequiresModKey])

  // Handle style version changes
  useEffect(() => {
    visualizationRef.current?.update({
      updateNodes: true,
      updateRelationships: true,
      restartSimulation: false
    })
  }, [styleVersion])

  return (
    <StyledSvgWrapper ref={wrapperRef}>
      <svg className="neod3viz" ref={svgRef} />
      <StyledZoomHolder offset={offset} isFullscreen={isFullscreen}>
        <StyledZoomButton
          aria-label={'zoom-in'}
          className={'zoom-in'}
          disabled={zoomInLimitReached}
          onClick={zoomInClicked}
        >
          <ZoomInIcon large={isFullscreen} />
        </StyledZoomButton>
        <StyledZoomButton
          aria-label={'zoom-out'}
          className={'zoom-out'}
          disabled={zoomOutLimitReached}
          onClick={zoomOutClicked}
        >
          <ZoomOutIcon large={isFullscreen} />
        </StyledZoomButton>
        <StyledZoomButton aria-label={'zoom-to-fit'} onClick={zoomToFitClicked}>
          <ZoomToFitIcon large={isFullscreen} />
        </StyledZoomButton>
      </StyledZoomHolder>
      {wheelZoomInfoMessageEnabled && displayingWheelZoomInfoMessage && (
        <WheelZoomInfoOverlay
          onDisableWheelZoomInfoMessage={disableWheelZoomInfoMessage}
        />
      )}
    </StyledSvgWrapper>
  )
}
