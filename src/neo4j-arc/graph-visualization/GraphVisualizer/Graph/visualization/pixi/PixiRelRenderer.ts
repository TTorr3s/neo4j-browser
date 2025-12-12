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
import { Container, Graphics, Sprite } from 'pixi.js'

import { GraphStyleModel } from '../../../../models/GraphStyle'
import { RelationshipModel } from '../../../../models/Relationship'
import { hexToNumber } from './PixiNodeRenderer'
import { PixiTextRenderer } from './PixiTextRenderer'
import { SVGPathParser } from './SVGPathParser'

const OVERLAY_MIN_WIDTH = 16
const SELECTION_ALPHA = 0.3
const SELECTED_STROKE_WIDTH = 3

interface RelGraphicsBundle {
  container: Container
  outline: Graphics
  overlay: Graphics
  caption: Sprite | null
  selected: boolean
}

/**
 * Renders relationships (arrows) using PixiJS Graphics
 * Converts SVG paths from Arrow classes to PixiJS draw commands
 */
export class PixiRelRenderer {
  private relGraphics: Map<string, RelGraphicsBundle> = new Map()
  private pathParser: SVGPathParser
  private textRenderer: PixiTextRenderer

  constructor(private style: GraphStyleModel) {
    this.pathParser = new SVGPathParser()
    this.textRenderer = new PixiTextRenderer()
  }

  /**
   * Create or update a relationship's graphics
   */
  updateRelationship(
    rel: RelationshipModel,
    parentContainer: Container
  ): Container {
    let bundle = this.relGraphics.get(rel.id)

    if (!bundle) {
      bundle = this.createRelBundle(rel)
      this.relGraphics.set(rel.id, bundle)
      parentContainer.addChild(bundle.container)
    }

    this.updateRelStyle(rel, bundle)

    return bundle.container
  }

  /**
   * Create graphics bundle for a new relationship
   */
  private createRelBundle(rel: RelationshipModel): RelGraphicsBundle {
    const container = new Container()
    container.label = `rel-${rel.id}`

    // Overlay is behind outline (used for hit detection)
    const overlay = new Graphics()
    overlay.label = 'overlay'
    overlay.alpha = 0 // Invisible but still interactive

    // Main arrow shape
    const outline = new Graphics()
    outline.label = 'outline'

    // Order matters: overlay behind outline
    container.addChild(overlay)
    container.addChild(outline)

    return { container, outline, overlay, caption: null, selected: false }
  }

  /**
   * Update relationship visual style
   */
  private updateRelStyle(
    rel: RelationshipModel,
    bundle: RelGraphicsBundle
  ): void {
    const relStyle = this.style.forRelationship(rel)

    // Parse style values
    const fillColor = hexToNumber(relStyle.get('color'))
    const fontSize = parseFloat(relStyle.get('font-size')) || 8
    const textColor = relStyle.get('text-color-external') || '#c0caf5'

    // Clear existing graphics
    bundle.outline.clear()
    bundle.overlay.clear()

    // Check if arrow exists and has outline method
    if (!rel.arrow || typeof rel.arrow.outline !== 'function') {
      return
    }

    // Get SVG paths from arrow
    const shortCaptionLength = rel.shortCaptionLength ?? 0
    const outlinePath = rel.arrow.outline(shortCaptionLength)
    const overlayPath = rel.arrow.overlay(OVERLAY_MIN_WIDTH)

    // Draw outline (visible arrow)
    this.drawArrowPath(bundle.outline, outlinePath, fillColor, rel.selected)

    // Draw overlay (hit detection area)
    this.drawArrowPath(bundle.overlay, overlayPath, 0x000000, false)
    bundle.overlay.alpha = 0 // Keep overlay invisible

    // Update position and rotation
    this.updateRelPosition(rel, bundle)

    // Update caption
    this.updateCaption(rel, bundle, textColor, fontSize)

    // Track selection state
    bundle.selected = rel.selected
  }

  /**
   * Draw arrow path to Graphics object
   */
  private drawArrowPath(
    graphics: Graphics,
    pathString: string,
    fillColor: number,
    selected: boolean
  ): void {
    if (!pathString) return

    // Draw the path
    this.pathParser.drawPath(pathString, graphics, fillColor)

    // Add selection highlight
    if (selected) {
      graphics.stroke({
        color: fillColor,
        width: SELECTED_STROKE_WIDTH,
        alpha: SELECTION_ALPHA
      })
    }
  }

  /**
   * Update relationship position based on source/target nodes
   */
  updateRelPosition(rel: RelationshipModel, bundle?: RelGraphicsBundle): void {
    const graphics = bundle || this.relGraphics.get(rel.id)
    if (!graphics) return

    const source = rel.source

    // Position at source node
    graphics.container.x = source.x ?? 0
    graphics.container.y = source.y ?? 0

    // Rotate to point toward target
    // SVG uses: rotate(naturalAngle + 180), so we add PI radians
    // naturalAngle is in degrees, convert to radians and add 180 degrees (PI)
    const angleRad = ((rel.naturalAngle + 180) * Math.PI) / 180
    graphics.container.rotation = angleRad
  }

  /**
   * Update caption for relationship
   */
  private updateCaption(
    rel: RelationshipModel,
    bundle: RelGraphicsBundle,
    textColor: string,
    fontSize: number
  ): void {
    // Remove existing caption
    if (bundle.caption) {
      bundle.container.removeChild(bundle.caption)
      bundle.caption.destroy()
      bundle.caption = null
    }

    // Check if we have caption text
    if (!rel.shortCaption || !rel.arrow) {
      return
    }

    // Create caption sprite
    const sprite = this.textRenderer.createTextSprite(
      rel.shortCaption,
      fontSize,
      textColor
    )
    sprite.anchor.set(0.5, 0.5)
    sprite.label = 'caption'

    // Position at midpoint of arrow shaft
    const midPoint = rel.arrow.midShaftPoint
    if (midPoint) {
      sprite.x = midPoint.x
      sprite.y = midPoint.y
    }

    // Rotate caption to be readable
    // Flip text if arrow is pointing left (90-270 degrees)
    const naturalAngle = rel.naturalAngle ?? 0
    if (naturalAngle > 90 && naturalAngle < 270) {
      sprite.rotation = Math.PI // Flip 180 degrees
    }

    bundle.container.addChild(sprite)
    bundle.caption = sprite
  }

  /**
   * Update positions for all relationships (called on each simulation tick)
   * This redraws the arrow paths since they depend on node positions
   */
  updateAllPositions(relationships: RelationshipModel[]): void {
    for (const rel of relationships) {
      const bundle = this.relGraphics.get(rel.id)
      if (bundle) {
        // Update container position and rotation
        this.updateRelPosition(rel, bundle)

        // Redraw the arrow path (it changes based on node positions)
        this.redrawArrowPath(rel, bundle)

        // Update caption position if it exists
        if (bundle.caption && rel.arrow?.midShaftPoint) {
          bundle.caption.x = rel.arrow.midShaftPoint.x
          bundle.caption.y = rel.arrow.midShaftPoint.y
        }
      }
    }
  }

  /**
   * Redraw the arrow path for a relationship
   * Called on each tick because the path geometry changes with node positions
   */
  private redrawArrowPath(
    rel: RelationshipModel,
    bundle: RelGraphicsBundle
  ): void {
    if (!rel.arrow || typeof rel.arrow.outline !== 'function') {
      return
    }

    const relStyle = this.style.forRelationship(rel)
    const fillColor = hexToNumber(relStyle.get('color'))

    // Get updated SVG paths from arrow
    const shortCaptionLength = rel.shortCaptionLength ?? 0
    const outlinePath = rel.arrow.outline(shortCaptionLength)
    const overlayPath = rel.arrow.overlay(OVERLAY_MIN_WIDTH)

    // Clear and redraw outline
    bundle.outline.clear()
    this.pathParser.drawPath(outlinePath, bundle.outline, fillColor)
    if (bundle.selected) {
      bundle.outline.stroke({
        color: fillColor,
        width: SELECTED_STROKE_WIDTH,
        alpha: SELECTION_ALPHA
      })
    }

    // Clear and redraw overlay (hit detection area)
    bundle.overlay.clear()
    this.pathParser.drawPath(overlayPath, bundle.overlay, 0x000000)
    bundle.overlay.alpha = 0
  }

  /**
   * Set selection state for a relationship
   */
  setSelected(relId: string, selected: boolean): void {
    const bundle = this.relGraphics.get(relId)
    if (bundle && bundle.selected !== selected) {
      bundle.selected = selected
      // Re-render with new selection state would require relationship reference
      // For now, this is handled by full updateRelationship call
    }
  }

  /**
   * Remove a relationship's graphics
   */
  removeRelationship(relId: string): void {
    const bundle = this.relGraphics.get(relId)
    if (bundle) {
      bundle.container.destroy({ children: true })
      this.relGraphics.delete(relId)
    }
  }

  /**
   * Remove all relationships
   */
  clear(): void {
    for (const bundle of this.relGraphics.values()) {
      bundle.container.destroy({ children: true })
    }
    this.relGraphics.clear()
  }

  /**
   * Get relationship bundle by ID (for hit detection)
   */
  getRelBundle(relId: string): RelGraphicsBundle | undefined {
    return this.relGraphics.get(relId)
  }

  /**
   * Get all relationship IDs
   */
  getRelIds(): string[] {
    return Array.from(this.relGraphics.keys())
  }

  /**
   * Get count of rendered relationships
   */
  getCount(): number {
    return this.relGraphics.size
  }

  /**
   * Destroy renderer and free resources
   */
  destroy(): void {
    this.clear()
    this.pathParser.clearCache()
    this.textRenderer.destroy()
  }
}
