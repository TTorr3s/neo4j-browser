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
import { Application, Container, FederatedPointerEvent } from 'pixi.js'

import {
  DEFAULT_ALPHA_TARGET,
  DRAGGING_ALPHA,
  DRAGGING_ALPHA_TARGET,
  ZOOM_FIT_PADDING_PERCENT,
  ZOOM_MAX_SCALE,
  ZOOM_MIN_SCALE
} from '../../../../constants'
import { GraphModel } from '../../../../models/Graph'
import { GraphStyleModel } from '../../../../models/GraphStyle'
import { NodeModel } from '../../../../models/Node'
import { RelationshipModel } from '../../../../models/Relationship'
import { ZoomLimitsReached, ZoomType } from '../../../../types'
import { isNullish } from '../../../../utils/utils'
import { ForceSimulation } from '../ForceSimulation'
import { GraphGeometryModel } from '../GraphGeometryModel'
import { RenderEngine, UpdateOptions } from '../RenderEngine'
import { HitResult, PixiHitDetection } from './PixiHitDetection'
import { PixiNodeRenderer } from './PixiNodeRenderer'
import { PixiRelRenderer } from './PixiRelRenderer'

type MeasureSizeFn = () => { width: number; height: number }

// Drag tolerance in pixels (squared to avoid sqrt)
const DRAG_TOLERANCE_SQ = 25 * 25

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
  private hitDetection: PixiHitDetection | null = null

  private geometry: GraphGeometryModel
  private zoomMinScaleExtent: number = ZOOM_MIN_SCALE

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private callbacks: Record<
    string,
    undefined | Array<(...args: any[]) => void>
  > = {}

  private initialized = false
  private isZoomClick = false

  // Interaction state
  private dragState: {
    active: boolean
    node: NodeModel | null
    startX: number
    startY: number
    restartedSimulation: boolean
  } = {
    active: false,
    node: null,
    startX: 0,
    startY: 0,
    restartedSimulation: false
  }

  private hoverState: {
    node: NodeModel | null
    relationship: RelationshipModel | null
  } = {
    node: null,
    relationship: null
  }

  private lastClickTime = 0
  private lastClickTarget: NodeModel | null = null
  private readonly DOUBLE_CLICK_THRESHOLD = 300 // ms

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

    // Use higher resolution for crisp rendering on high-DPI displays
    const resolution = Math.min(window.devicePixelRatio || 1, 3)

    this.app = new Application()
    await this.app.init({
      canvas: this.canvas,
      width: size.width,
      height: size.height,
      antialias: true,
      backgroundColor: 0xffffff,
      resolution: resolution,
      autoDensity: true,
      // Improve rendering quality
      roundPixels: false, // Allow sub-pixel positioning for smooth animations
      preference: 'webgl' // Prefer WebGL over WebGPU for better compatibility
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

    // Initialize renderers and hit detection
    this.nodeRenderer = new PixiNodeRenderer(this.style)
    this.relRenderer = new PixiRelRenderer(this.style)
    this.hitDetection = new PixiHitDetection()

    // Set up zoom event handling
    this.viewport.on('zoomed', () => {
      const scale = this.viewport?.scale.x ?? 1
      const limitsReached: ZoomLimitsReached = {
        zoomInLimitReached: scale >= ZOOM_MAX_SCALE,
        zoomOutLimitReached: scale <= this.zoomMinScaleExtent
      }
      this.onZoomEvent(limitsReached)
    })

    // Set up interaction events
    this.setupInteractionEvents()

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
   * Set up pointer interaction events on the viewport
   */
  private setupInteractionEvents(): void {
    if (!this.viewport) return

    // Make viewport interactive
    this.viewport.eventMode = 'static'

    // Pointer down - start potential drag or click
    this.viewport.on('pointerdown', this.onPointerDown.bind(this))

    // Pointer move - handle drag or hover
    this.viewport.on('pointermove', this.onPointerMove.bind(this))

    // Pointer up - end drag or register click
    this.viewport.on('pointerup', this.onPointerUp.bind(this))

    // Pointer leave - clean up hover state
    this.viewport.on('pointerleave', this.onPointerLeave.bind(this))
  }

  /**
   * Handle pointer down event
   */
  private onPointerDown(event: FederatedPointerEvent): void {
    if (!this.viewport) return

    const worldPos = this.viewport.toWorld(event.global)
    const hit = this.performHitTest(worldPos.x, worldPos.y)

    if (hit?.type === 'node') {
      // Start tracking potential drag
      this.dragState = {
        active: true,
        node: hit.item,
        startX: worldPos.x,
        startY: worldPos.y,
        restartedSimulation: false
      }

      // Fix node position during potential drag
      hit.item.hoverFixed = false
      hit.item.fx = hit.item.x
      hit.item.fy = hit.item.y

      // Pause viewport drag while potentially dragging a node
      this.viewport.plugins.pause('drag')
    } else if (hit?.type === 'relationship') {
      // Relationship click
      this.trigger('relationshipClicked', hit.item)
    } else {
      // Canvas click (will be confirmed on pointer up if no drag)
      this.dragState = {
        active: false,
        node: null,
        startX: worldPos.x,
        startY: worldPos.y,
        restartedSimulation: false
      }
    }
  }

  /**
   * Handle pointer move event
   */
  private onPointerMove(event: FederatedPointerEvent): void {
    if (!this.viewport) return

    const worldPos = this.viewport.toWorld(event.global)

    // Handle node dragging
    if (this.dragState.active && this.dragState.node) {
      const dx = worldPos.x - this.dragState.startX
      const dy = worldPos.y - this.dragState.startY
      const distSq = dx * dx + dy * dy

      // Check if we've exceeded drag tolerance
      if (distSq > DRAG_TOLERANCE_SQ && !this.dragState.restartedSimulation) {
        // Start actual drag - restart simulation
        this.forceSimulation.simulation
          .alphaTarget(DRAGGING_ALPHA_TARGET)
          .alpha(DRAGGING_ALPHA)
          .restart()
        this.dragState.restartedSimulation = true
      }

      // Update node position
      this.dragState.node.hoverFixed = false
      this.dragState.node.fx = worldPos.x
      this.dragState.node.fy = worldPos.y

      return
    }

    // Handle hover detection (only when not dragging)
    this.handleHover(worldPos.x, worldPos.y)
  }

  /**
   * Handle pointer up event
   */
  private onPointerUp(event: FederatedPointerEvent): void {
    if (!this.viewport) return

    const worldPos = this.viewport.toWorld(event.global)

    // Resume viewport drag
    this.viewport.plugins.resume('drag')

    if (this.dragState.active && this.dragState.node) {
      const node = this.dragState.node

      if (this.dragState.restartedSimulation) {
        // Was a real drag - stop simulation
        this.forceSimulation.simulation.alphaTarget(DEFAULT_ALPHA_TARGET)
        // Keep node fixed at final position (don't reset fx/fy)
      } else {
        // Was just a click - not a drag
        const now = Date.now()
        const isDoubleClick =
          this.lastClickTarget === node &&
          now - this.lastClickTime < this.DOUBLE_CLICK_THRESHOLD

        if (isDoubleClick) {
          this.trigger('nodeDblClicked', node)
          this.lastClickTarget = null
          this.lastClickTime = 0
        } else {
          this.trigger('nodeClicked', node)
          this.lastClickTarget = node
          this.lastClickTime = now
        }

        // Reset fx/fy since it wasn't a real drag
        node.fx = null
        node.fy = null
      }
    } else {
      // Check if this is a canvas click (no node was under pointer)
      const hit = this.performHitTest(worldPos.x, worldPos.y)
      if (!hit) {
        this.trigger('canvasClicked')
      }
    }

    // Reset drag state
    this.dragState = {
      active: false,
      node: null,
      startX: 0,
      startY: 0,
      restartedSimulation: false
    }
  }

  /**
   * Handle pointer leave event
   */
  private onPointerLeave(): void {
    // Clear any hover state
    if (this.hoverState.node) {
      this.trigger('nodeMouseOut', this.hoverState.node)
      // Reset hover-fixed state
      if (this.hoverState.node.hoverFixed) {
        this.hoverState.node.hoverFixed = false
        this.hoverState.node.fx = null
        this.hoverState.node.fy = null
      }
      this.hoverState.node = null
    }

    if (this.hoverState.relationship) {
      this.trigger('relMouseOut', this.hoverState.relationship)
      this.hoverState.relationship = null
    }
  }

  /**
   * Handle hover state changes
   */
  private handleHover(worldX: number, worldY: number): void {
    const hit = this.performHitTest(worldX, worldY)

    // Handle node hover
    if (hit?.type === 'node') {
      const node = hit.item
      if (this.hoverState.node !== node) {
        // Mouse out of previous node
        if (this.hoverState.node) {
          this.handleNodeMouseOut(this.hoverState.node)
        }
        // Mouse out of previous relationship
        if (this.hoverState.relationship) {
          this.trigger('relMouseOut', this.hoverState.relationship)
          this.hoverState.relationship = null
        }
        // Mouse over new node
        this.handleNodeMouseOver(node)
        this.hoverState.node = node
      }
    } else if (hit?.type === 'relationship') {
      const rel = hit.item
      if (this.hoverState.relationship !== rel) {
        // Mouse out of previous node
        if (this.hoverState.node) {
          this.handleNodeMouseOut(this.hoverState.node)
          this.hoverState.node = null
        }
        // Mouse out of previous relationship
        if (this.hoverState.relationship) {
          this.trigger('relMouseOut', this.hoverState.relationship)
        }
        // Mouse over new relationship
        this.trigger('relMouseOver', rel)
        this.hoverState.relationship = rel
      }
    } else {
      // No hit - clear all hover states
      if (this.hoverState.node) {
        this.handleNodeMouseOut(this.hoverState.node)
        this.hoverState.node = null
      }
      if (this.hoverState.relationship) {
        this.trigger('relMouseOut', this.hoverState.relationship)
        this.hoverState.relationship = null
      }
    }
  }

  /**
   * Handle node mouse over (fixes node position temporarily)
   */
  private handleNodeMouseOver(node: NodeModel): void {
    if (!node.fx && !node.fy) {
      node.hoverFixed = true
      node.fx = node.x
      node.fy = node.y
    }
    this.trigger('nodeMouseOver', node)
  }

  /**
   * Handle node mouse out (unfixes node position if hover-fixed)
   */
  private handleNodeMouseOut(node: NodeModel): void {
    if (node.hoverFixed) {
      node.hoverFixed = false
      node.fx = null
      node.fy = null
    }
    this.trigger('nodeMouseOut', node)
  }

  /**
   * Perform hit test using spatial hash grid
   */
  private performHitTest(worldX: number, worldY: number): HitResult {
    if (!this.hitDetection) return null
    return this.hitDetection.hitTest(worldX, worldY)
  }

  /**
   * Rebuild hit detection grid after graph changes
   */
  private rebuildHitDetectionGrid(): void {
    if (!this.hitDetection) return
    this.hitDetection.rebuildGrid(
      this.graph.nodes(),
      this.graph.relationships()
    )
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

    // Rebuild hit detection grid
    this.rebuildHitDetectionGrid()
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

    // Rebuild hit detection grid
    this.rebuildHitDetectionGrid()

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

    if (this.hitDetection) {
      this.hitDetection.clear()
      this.hitDetection = null
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

    // Reset interaction state
    this.dragState = {
      active: false,
      node: null,
      startX: 0,
      startY: 0,
      restartedSimulation: false
    }
    this.hoverState = {
      node: null,
      relationship: null
    }
  }
}
