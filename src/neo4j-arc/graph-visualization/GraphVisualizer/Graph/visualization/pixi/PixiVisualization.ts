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
import { Viewport } from 'pixi-viewport'
import { Application, Container } from 'pixi.js'

import {
  ZOOM_FIT_PADDING_PERCENT,
  ZOOM_MAX_SCALE,
  ZOOM_MIN_SCALE
} from '../../../../constants'
import { GraphModel } from '../../../../models/Graph'
import { GraphStyleModel } from '../../../../models/GraphStyle'
import { ZoomLimitsReached, ZoomType } from '../../../../types'
import { isNullish } from '../../../../utils/utils'
import { ForceSimulation } from '../ForceSimulation'
import { GraphGeometryModel } from '../GraphGeometryModel'
import { RenderEngine, UpdateOptions } from '../RenderEngine'
import { PixiNodeRenderer } from './PixiNodeRenderer'
import { PixiRelRenderer } from './PixiRelRenderer'

type MeasureSizeFn = () => { width: number; height: number }

/**
 * WebGL-based graph visualization using PixiJS
 * This renderer is optimized for large graphs (5,000-10,000+ nodes)
 */
export class PixiVisualization implements RenderEngine {
  private app: Application | null = null
  private viewport: Viewport | null = null
  private nodeContainer: Container | null = null
  private relationshipContainer: Container | null = null
  private nodeRenderer: PixiNodeRenderer | null = null
  private relRenderer: PixiRelRenderer | null = null

  private geometry: GraphGeometryModel
  private zoomMinScaleExtent: number = ZOOM_MIN_SCALE

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private callbacks: Record<
    string,
    undefined | Array<(...args: any[]) => void>
  > = {}

  private initialized = false
  private isZoomClick = false

  forceSimulation: ForceSimulation

  constructor(
    private canvas: HTMLCanvasElement,
    private measureSize: MeasureSizeFn,
    private onZoomEvent: (limitsReached: ZoomLimitsReached) => void,
    private onDisplayZoomWheelInfoMessage: () => void,
    private graph: GraphModel,
    public style: GraphStyleModel,
    public isFullscreen: boolean,
    public wheelZoomRequiresModKey?: boolean,
    private initialZoomToFit?: boolean
  ) {
    this.geometry = new GraphGeometryModel(style)
    this.forceSimulation = new ForceSimulation(this.render.bind(this))
  }

  private async initializePixi(): Promise<void> {
    if (this.initialized) return

    const size = this.measureSize()

    this.app = new Application()
    await this.app.init({
      canvas: this.canvas,
      width: size.width,
      height: size.height,
      antialias: true,
      backgroundColor: 0xffffff,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    // Create viewport for pan/zoom
    this.viewport = new Viewport({
      screenWidth: size.width,
      screenHeight: size.height,
      worldWidth: size.width * 2,
      worldHeight: size.height * 2,
      events: this.app.renderer.events
    })

    this.app.stage.addChild(this.viewport)

    // Enable pan and zoom
    this.viewport.drag().pinch().wheel().decelerate().clampZoom({
      minScale: this.zoomMinScaleExtent,
      maxScale: ZOOM_MAX_SCALE
    })

    // Center the viewport
    this.viewport.moveCenter(0, 0)

    // Create layer containers (relationships below nodes)
    this.relationshipContainer = new Container()
    this.nodeContainer = new Container()
    this.viewport.addChild(this.relationshipContainer)
    this.viewport.addChild(this.nodeContainer)

    // Initialize renderers
    this.nodeRenderer = new PixiNodeRenderer(this.style)
    this.relRenderer = new PixiRelRenderer(this.style)

    // Set up zoom event handling
    this.viewport.on('zoomed', () => {
      const scale = this.viewport?.scale.x ?? 1
      const limitsReached: ZoomLimitsReached = {
        zoomInLimitReached: scale >= ZOOM_MAX_SCALE,
        zoomOutLimitReached: scale <= this.zoomMinScaleExtent
      }
      this.onZoomEvent(limitsReached)
    })

    // Set up click handling for canvas
    this.viewport.on('clicked', event => {
      // Check if click was on empty space
      if (event.world) {
        const hit = this.hitTest(event.world.x, event.world.y)
        if (!hit) {
          this.trigger('canvasClicked')
        }
      }
    })

    // Handle wheel zoom modifier key requirement
    if (this.wheelZoomRequiresModKey) {
      this.viewport.plugins.pause('wheel')
      this.canvas.addEventListener('wheel', e => {
        const modKeySelected = e.metaKey || e.ctrlKey || e.shiftKey
        if (modKeySelected) {
          this.viewport?.plugins.resume('wheel')
        } else {
          this.viewport?.plugins.pause('wheel')
          this.onDisplayZoomWheelInfoMessage()
        }
      })
    }

    this.initialized = true
  }

  /**
   * Hit test at world coordinates
   * TODO: Implement spatial hash for efficient hit detection
   */
  private hitTest(
    _worldX: number,
    _worldY: number
  ): { type: 'node' | 'relationship'; id: string } | null {
    // Placeholder - will be implemented in Phase 4
    return null
  }

  private render(): void {
    if (!this.initialized || !this.viewport) return

    this.geometry.onTick(this.graph)

    // Update node positions from simulation
    if (this.nodeRenderer) {
      this.nodeRenderer.updateAllPositions(this.graph.nodes())
    }

    // Update relationship positions
    if (this.relRenderer) {
      this.relRenderer.updateAllPositions(this.graph.relationships())
    }
  }

  init(): void {
    // Initialize PixiJS asynchronously
    this.initializePixi()
      .then(() => {
        this.updateNodes()
        this.updateRelationships()
        this.adjustZoomMinScaleExtentToFitGraph()
        this.setInitialZoom()
      })
      .catch(error => {
        console.error('Failed to initialize PixiJS visualization:', error)
      })
  }

  private updateNodes(): void {
    if (!this.nodeContainer || !this.nodeRenderer) return

    const nodes = this.graph.nodes()

    // Update geometry (calculates radius, captions, etc.)
    this.geometry.onGraphChange(this.graph, {
      updateNodes: true,
      updateRelationships: false
    })

    // Clear existing node graphics
    this.nodeRenderer.clear()
    this.nodeContainer.removeChildren()

    // Render each node
    for (const node of nodes) {
      this.nodeRenderer.updateNode(node, this.nodeContainer)
    }

    // Update force simulation
    this.forceSimulation.updateNodes(this.graph)
    this.forceSimulation.updateRelationships(this.graph)
  }

  private updateRelationships(): void {
    if (!this.relationshipContainer || !this.relRenderer) return

    const relationships = this.graph.relationships()
    this.geometry.onGraphChange(this.graph, {
      updateNodes: false,
      updateRelationships: true
    })

    // Clear existing relationship graphics
    this.relRenderer.clear()
    this.relationshipContainer.removeChildren()

    // Render each relationship
    for (const rel of relationships) {
      this.relRenderer.updateRelationship(rel, this.relationshipContainer)
    }

    // Update force simulation
    this.forceSimulation.updateRelationships(this.graph)

    this.render()
  }

  setInitialZoom(): void {
    if (!this.viewport) return

    const count = this.graph.nodes().length
    // Same formula as SVG visualization
    const scale = -0.02364554 + 1.913 / (1 + (count / 12.7211) ** 0.8156444)
    this.viewport.setZoom(Math.max(0.1, scale))
  }

  precomputeAndStart(): void {
    this.forceSimulation.precomputeAndStart(() => {
      if (this.initialZoomToFit) {
        this.zoomByType(ZoomType.FIT)
      }
    })
  }

  update(options: UpdateOptions): void {
    if (options.updateNodes) {
      this.updateNodes()
    }

    if (options.updateRelationships) {
      this.updateRelationships()
    }

    if (options.restartSimulation ?? true) {
      this.forceSimulation.restart()
    }
    this.trigger('updated')
  }

  zoomByType(zoomType: ZoomType): void {
    if (!this.viewport) return

    this.isZoomClick = true

    if (zoomType === ZoomType.IN) {
      this.viewport.zoomPercent(0.3, true)
    } else if (zoomType === ZoomType.OUT) {
      this.viewport.zoomPercent(-0.3, true)
    } else if (zoomType === ZoomType.FIT) {
      this.zoomToFitViewport()
      this.adjustZoomMinScaleExtentToFitGraph(1)
    }
  }

  private zoomToFitViewport(): void {
    if (!this.viewport) return

    const bounds = this.getGraphBounds()
    if (!bounds) return

    const size = this.measureSize()
    const scaleX = (size.width * (1 - ZOOM_FIT_PADDING_PERCENT)) / bounds.width
    const scaleY =
      (size.height * (1 - ZOOM_FIT_PADDING_PERCENT)) / bounds.height
    const scale = Math.min(scaleX, scaleY, ZOOM_MAX_SCALE)

    this.viewport.setZoom(scale, true)
    this.viewport.moveCenter(bounds.centerX, bounds.centerY)
  }

  private getGraphBounds(): {
    width: number
    height: number
    centerX: number
    centerY: number
  } | null {
    const nodes = this.graph.nodes()
    if (nodes.length === 0) return null

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const node of nodes) {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const r = node.radius ?? 25

      minX = Math.min(minX, x - r)
      maxX = Math.max(maxX, x + r)
      minY = Math.min(minY, y - r)
      maxY = Math.max(maxY, y + r)
    }

    return {
      width: maxX - minX || 100,
      height: maxY - minY || 100,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  }

  private adjustZoomMinScaleExtentToFitGraph(paddingFactor = 0.75): void {
    if (!this.viewport) return

    const bounds = this.getGraphBounds()
    if (!bounds) return

    const size = this.measureSize()
    const scaleX = size.width / bounds.width
    const scaleY = size.height / bounds.height
    const scaleToFit = Math.min(scaleX, scaleY) * paddingFactor

    if (scaleToFit <= this.zoomMinScaleExtent) {
      this.zoomMinScaleExtent = scaleToFit
      this.viewport.clampZoom({
        minScale: scaleToFit,
        maxScale: ZOOM_MAX_SCALE
      })
    }
  }

  boundingBox(): DOMRect | undefined {
    const bounds = this.getGraphBounds()
    if (!bounds) return undefined

    return new DOMRect(
      bounds.centerX - bounds.width / 2,
      bounds.centerY - bounds.height / 2,
      bounds.width,
      bounds.height
    )
  }

  resize(isFullscreen: boolean, wheelZoomRequiresModKey: boolean): void {
    const size = this.measureSize()
    this.isFullscreen = isFullscreen
    this.wheelZoomRequiresModKey = wheelZoomRequiresModKey

    if (this.app) {
      this.app.renderer.resize(size.width, size.height)
    }

    if (this.viewport) {
      this.viewport.resize(size.width, size.height)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void): this {
    if (isNullish(this.callbacks[event])) {
      this.callbacks[event] = []
    }

    this.callbacks[event]?.push(callback)
    return this
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger(event: string, ...args: any[]): void {
    const callbacksForEvent = this.callbacks[event] ?? []
    callbacksForEvent.forEach(callback => callback.apply(null, args))
  }

  /**
   * Clean up PixiJS resources
   */
  destroy(): void {
    if (this.nodeRenderer) {
      this.nodeRenderer.destroy()
      this.nodeRenderer = null
    }

    if (this.relRenderer) {
      this.relRenderer.destroy()
      this.relRenderer = null
    }

    if (this.viewport) {
      this.viewport.destroy()
      this.viewport = null
    }

    if (this.app) {
      this.app.destroy(true)
      this.app = null
    }

    this.nodeContainer = null
    this.relationshipContainer = null
    this.initialized = false
  }
}
