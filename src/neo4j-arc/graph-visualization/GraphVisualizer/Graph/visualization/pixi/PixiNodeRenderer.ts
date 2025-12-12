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
import { Container, Graphics } from 'pixi.js'

import { GraphStyleModel } from '../../../../models/GraphStyle'
import { NodeModel } from '../../../../models/Node'
import { PixiTextRenderer } from './PixiTextRenderer'

const NODE_RING_STROKE_SIZE = 8
const NODE_RING_PADDING = 4

interface NodeGraphicsBundle {
  container: Container
  outline: Graphics
  ring: Graphics
  captionContainer: Container
}

/**
 * Renders nodes using PixiJS Graphics
 */
export class PixiNodeRenderer {
  private nodeGraphics: Map<string, NodeGraphicsBundle> = new Map()
  private textRenderer: PixiTextRenderer

  constructor(private style: GraphStyleModel) {
    this.textRenderer = new PixiTextRenderer()
  }

  /**
   * Create or update a node's graphics
   */
  updateNode(node: NodeModel, parentContainer: Container): Container {
    let bundle = this.nodeGraphics.get(node.id)

    if (!bundle) {
      bundle = this.createNodeBundle(node)
      this.nodeGraphics.set(node.id, bundle)
      parentContainer.addChild(bundle.container)
    }

    this.updateNodeStyle(node, bundle)
    this.updateNodePosition(node, bundle)

    return bundle.container
  }

  /**
   * Create graphics bundle for a new node
   */
  private createNodeBundle(node: NodeModel): NodeGraphicsBundle {
    const container = new Container()
    container.label = `node-${node.id}`

    // Ring goes behind outline (selection indicator)
    const ring = new Graphics()
    ring.label = 'ring'
    ring.visible = false

    // Main circle outline
    const outline = new Graphics()
    outline.label = 'outline'

    // Caption container for text sprites
    const captionContainer = new Container()
    captionContainer.label = 'caption'

    // Order matters: ring, outline, caption
    container.addChild(ring)
    container.addChild(outline)
    container.addChild(captionContainer)

    return { container, outline, ring, captionContainer }
  }

  /**
   * Update node visual style (colors, size)
   */
  private updateNodeStyle(node: NodeModel, bundle: NodeGraphicsBundle): void {
    const nodeStyle = this.style.forNode(node)
    const radius = node.radius || 25

    // Parse style values
    const fillColor = hexToNumber(nodeStyle.get('color'))
    const strokeColor = hexToNumber(nodeStyle.get('border-color'))
    const strokeWidth = parseFloat(nodeStyle.get('border-width')) || 2
    const textColor = nodeStyle.get('text-color-internal') || '#000000'
    const fontSize = parseFloat(nodeStyle.get('font-size')) || 10

    // Draw outline circle
    bundle.outline.clear()
    bundle.outline.circle(0, 0, radius)
    bundle.outline.fill(fillColor)
    bundle.outline.stroke({ color: strokeColor, width: strokeWidth })

    // Draw selection ring (always rendered, visibility controlled separately)
    bundle.ring.clear()
    bundle.ring.circle(0, 0, radius + NODE_RING_PADDING)
    bundle.ring.stroke({
      color: fillColor,
      width: NODE_RING_STROKE_SIZE,
      alpha: 0.3
    })
    bundle.ring.visible = node.selected

    // Update caption
    this.updateCaption(node, bundle.captionContainer, textColor, fontSize)
  }

  /**
   * Update node caption text
   */
  private updateCaption(
    node: NodeModel,
    container: Container,
    textColor: string,
    fontSize: number
  ): void {
    // Clear existing caption sprites
    container.removeChildren()

    if (!node.caption || node.caption.length === 0) {
      return
    }

    // Create sprite for each caption line
    for (const line of node.caption) {
      const sprite = this.textRenderer.createTextSprite(
        line.text,
        fontSize,
        textColor
      )

      // Center horizontally, position vertically using baseline
      sprite.anchor.set(0.5, 0.5)
      sprite.x = 0
      sprite.y = line.baseline

      container.addChild(sprite)
    }
  }

  /**
   * Update node position (called on each simulation tick)
   */
  updateNodePosition(node: NodeModel, bundle?: NodeGraphicsBundle): void {
    const graphics = bundle || this.nodeGraphics.get(node.id)
    if (!graphics) return

    graphics.container.x = node.x ?? 0
    graphics.container.y = node.y ?? 0
  }

  /**
   * Update positions for all nodes (called on simulation tick)
   */
  updateAllPositions(nodes: NodeModel[]): void {
    for (const node of nodes) {
      this.updateNodePosition(node)
    }
  }

  /**
   * Set selection state for a node
   */
  setSelected(nodeId: string, selected: boolean): void {
    const bundle = this.nodeGraphics.get(nodeId)
    if (bundle) {
      bundle.ring.visible = selected
    }
  }

  /**
   * Remove a node's graphics
   */
  removeNode(nodeId: string): void {
    const bundle = this.nodeGraphics.get(nodeId)
    if (bundle) {
      bundle.container.destroy({ children: true })
      this.nodeGraphics.delete(nodeId)
    }
  }

  /**
   * Remove all nodes
   */
  clear(): void {
    for (const bundle of this.nodeGraphics.values()) {
      bundle.container.destroy({ children: true })
    }
    this.nodeGraphics.clear()
  }

  /**
   * Get node bundle by ID (for hit detection)
   */
  getNodeBundle(nodeId: string): NodeGraphicsBundle | undefined {
    return this.nodeGraphics.get(nodeId)
  }

  /**
   * Get all node IDs
   */
  getNodeIds(): string[] {
    return Array.from(this.nodeGraphics.keys())
  }

  /**
   * Destroy renderer and free resources
   */
  destroy(): void {
    this.clear()
    this.textRenderer.destroy()
  }
}

/**
 * Convert hex color string to number for PixiJS
 * Supports formats: #RGB, #RRGGBB, RGB, RRGGBB
 */
export function hexToNumber(hex: string): number {
  if (!hex) return 0x7aa2f7 // Default blue

  // Remove # if present
  let cleanHex = hex.replace('#', '')

  // Expand shorthand (RGB -> RRGGBB)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map(c => c + c)
      .join('')
  }

  const num = parseInt(cleanHex, 16)
  return isNaN(num) ? 0x7aa2f7 : num
}
