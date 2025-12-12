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
import { GraphStyleModel } from '../../../models/GraphStyle'
import { ZoomType } from '../../../types'
import { ForceSimulation } from './ForceSimulation'

/**
 * Options for updating the visualization
 */
export type UpdateOptions = {
  updateNodes: boolean
  updateRelationships: boolean
  restartSimulation?: boolean
}

/**
 * RenderEngine interface defines the contract for graph visualization renderers.
 * Both SVG (D3) and WebGL (PixiJS) renderers implement this interface.
 */
export interface RenderEngine {
  /**
   * The force simulation engine (d3-force)
   * Used for physics-based layout of nodes
   */
  forceSimulation: ForceSimulation

  /**
   * The graph style model containing visual styling rules
   */
  style: GraphStyleModel

  /**
   * Whether the visualization is in fullscreen mode
   */
  isFullscreen: boolean

  /**
   * Whether wheel zoom requires a modifier key (ctrl/meta/shift)
   */
  wheelZoomRequiresModKey?: boolean

  /**
   * Register an event callback
   * @param event - Event name (e.g., 'nodeClicked', 'canvasClicked')
   * @param callback - Function to call when event fires
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, callback: (...args: any[]) => void): this

  /**
   * Trigger an event with optional arguments
   * @param event - Event name
   * @param args - Arguments to pass to callbacks
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger(event: string, ...args: any[]): void

  /**
   * Initialize the visualization
   * Sets up DOM/Canvas structure and renders initial graph
   */
  init(): void

  /**
   * Set the initial zoom level based on node count
   */
  setInitialZoom(): void

  /**
   * Pre-compute force simulation ticks and start animation
   * @param onComplete - Optional callback when precomputation is done
   */
  precomputeAndStart(): void

  /**
   * Update the visualization after graph or style changes
   */
  update(options: UpdateOptions): void

  /**
   * Get the bounding box of the rendered graph
   */
  boundingBox(): DOMRect | undefined

  /**
   * Handle container resize
   */
  resize(isFullscreen: boolean, wheelZoomRequiresModKey: boolean): void

  /**
   * Zoom in, out, or fit to viewport
   */
  zoomByType(zoomType: ZoomType): void
}
