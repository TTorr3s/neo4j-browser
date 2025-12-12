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
import { GraphModel, NodePair } from '../../../../models/Graph'
import { GraphStyleModel } from '../../../../models/GraphStyle'
import {
  RelationshipCaptionLayout,
  RelationshipModel
} from '../../../../models/Relationship'
import { ArcArrow } from '../../../../utils/ArcArrow'
import { LoopArrow } from '../../../../utils/LoopArrow'
import { StraightArrow } from '../../../../utils/StraightArrow'
import { measureText } from '../../../../utils/textMeasurement'

// Types for arrow geometry caching
interface ArrowCacheKey {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourceRadius: number
  targetRadius: number
  deflection: number
  shaftWidth: number
  captionLayout: RelationshipCaptionLayout
  isLoop: boolean
}

interface CachedArrow {
  key: ArrowCacheKey
  arrow: ArcArrow | LoopArrow | StraightArrow
}

// Tolerance for floating point comparison in geometry caching
const GEOMETRY_TOLERANCE = 0.01

export class PairwiseArcsRelationshipRouting {
  style: GraphStyleModel
  private canvas: HTMLCanvasElement
  private canvas2DContext: CanvasRenderingContext2D | null = null
  private arrowCache: Map<string, CachedArrow> = new Map()

  constructor(style: GraphStyleModel) {
    this.style = style
    this.canvas = document.createElement('canvas')
    this.canvas2DContext = this.canvas.getContext('2d')
  }

  measureRelationshipCaption(
    relationship: RelationshipModel,
    caption: string
  ): number {
    const fontFamily = 'sans-serif'
    const padding = parseFloat(
      this.style.forRelationship(relationship).get('padding')
    )
    // Reuse cached canvas context
    if (!this.canvas2DContext) {
      this.canvas2DContext = this.canvas.getContext('2d')
    }
    return (
      measureText(
        caption,
        fontFamily,
        relationship.captionHeight,
        this.canvas2DContext!
      ) +
      padding * 2
    )
  }

  captionFitsInsideArrowShaftWidth(relationship: RelationshipModel): boolean {
    return (
      parseFloat(this.style.forRelationship(relationship).get('shaft-width')) >
      relationship.captionHeight
    )
  }

  measureRelationshipCaptions(relationships: RelationshipModel[]): void {
    relationships.forEach(relationship => {
      relationship.captionHeight = parseFloat(
        this.style.forRelationship(relationship).get('font-size')
      )
      relationship.captionLength = this.measureRelationshipCaption(
        relationship,
        relationship.caption
      )

      relationship.captionLayout =
        this.captionFitsInsideArrowShaftWidth(relationship) &&
        !relationship.isLoop()
          ? 'internal'
          : 'external'
    })
  }

  shortenCaption(
    relationship: RelationshipModel,
    caption: string,
    targetWidth: number
  ): [string, number] {
    if (!caption || caption.length <= 2) {
      return ['', 0]
    }

    // Quick check: does the full caption fit?
    const fullWidth = this.measureRelationshipCaption(relationship, caption)
    if (fullWidth <= targetWidth) {
      return [caption, fullWidth]
    }

    // Binary search for optimal truncation point
    // This reduces O(n) iterations to O(log n) text measurements
    let low = 1
    let high = caption.length
    let bestCaption = ''
    let bestWidth = 0

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const truncated = `${caption.substring(0, mid)}\u2026`
      const width = this.measureRelationshipCaption(relationship, truncated)

      if (width <= targetWidth) {
        // This fits, try a longer version
        bestCaption = truncated
        bestWidth = width
        low = mid + 1
      } else {
        // Too wide, try a shorter version
        high = mid - 1
      }
    }

    if (bestCaption === '') {
      return ['', 0]
    }

    return [bestCaption, bestWidth]
  }

  computeGeometryForNonLoopArrows(nodePairs: NodePair[]): void {
    const square = (distance: number) => distance * distance

    nodePairs.forEach(nodePair => {
      if (!nodePair.isLoop()) {
        const dx = nodePair.nodeA.x - nodePair.nodeB.x
        const dy = nodePair.nodeA.y - nodePair.nodeB.y
        const angle = ((Math.atan2(dy, dx) / Math.PI) * 180 + 360) % 360
        const centreDistance = Math.sqrt(square(dx) + square(dy))

        nodePair.relationships.forEach(relationship => {
          relationship.naturalAngle =
            relationship.target === nodePair.nodeA ? (angle + 180) % 360 : angle
          relationship.centreDistance = centreDistance
        })
      }
    })
  }

  distributeAnglesForLoopArrows(
    nodePairs: NodePair[],
    relationships: RelationshipModel[]
  ): void {
    for (const nodePair of nodePairs) {
      if (nodePair.isLoop()) {
        let angles = []
        const node = nodePair.nodeA
        for (const relationship of Array.from(relationships)) {
          if (!relationship.isLoop()) {
            if (relationship.source === node) {
              angles.push(relationship.naturalAngle)
            }
            if (relationship.target === node) {
              angles.push(relationship.naturalAngle + 180)
            }
          }
        }
        angles = angles.map(a => (a + 360) % 360).sort((a, b) => a - b)

        if (angles.length > 0) {
          let end, start
          const biggestGap = {
            start: 0,
            end: 0
          }

          for (let i = 0; i < angles.length; i++) {
            const angle = angles[i]
            start = angle
            end = i === angles.length - 1 ? angles[0] + 360 : angles[i + 1]
            if (end - start > biggestGap.end - biggestGap.start) {
              biggestGap.start = start
              biggestGap.end = end
            }
          }
          const separation =
            (biggestGap.end - biggestGap.start) /
            (nodePair.relationships.length + 1)
          for (let i = 0; i < nodePair.relationships.length; i++) {
            const relationship = nodePair.relationships[i]
            relationship.naturalAngle =
              (biggestGap.start + (i + 1) * separation - 90) % 360
          }
        } else {
          const separation = 360 / nodePair.relationships.length
          for (let i = 0; i < nodePair.relationships.length; i++) {
            const relationship = nodePair.relationships[i]
            relationship.naturalAngle = i * separation
          }
        }
      }
    }
  }

  // Check if cached arrow geometry has changed beyond tolerance
  private arrowNeedsRecreation(
    relationshipId: string,
    newKey: ArrowCacheKey
  ): boolean {
    const cached = this.arrowCache.get(relationshipId)
    if (!cached) return true

    const { key } = cached

    // Check if any geometry parameter changed beyond tolerance
    return (
      Math.abs(key.sourceX - newKey.sourceX) > GEOMETRY_TOLERANCE ||
      Math.abs(key.sourceY - newKey.sourceY) > GEOMETRY_TOLERANCE ||
      Math.abs(key.targetX - newKey.targetX) > GEOMETRY_TOLERANCE ||
      Math.abs(key.targetY - newKey.targetY) > GEOMETRY_TOLERANCE ||
      Math.abs(key.sourceRadius - newKey.sourceRadius) > GEOMETRY_TOLERANCE ||
      Math.abs(key.targetRadius - newKey.targetRadius) > GEOMETRY_TOLERANCE ||
      Math.abs(key.deflection - newKey.deflection) > GEOMETRY_TOLERANCE ||
      Math.abs(key.shaftWidth - newKey.shaftWidth) > GEOMETRY_TOLERANCE ||
      key.captionLayout !== newKey.captionLayout ||
      key.isLoop !== newKey.isLoop
    )
  }

  layoutRelationships(graph: GraphModel): void {
    const nodePairs = graph.groupedRelationships()

    this.computeGeometryForNonLoopArrows(nodePairs)
    this.distributeAnglesForLoopArrows(nodePairs, graph.relationships())

    // Track active relationship IDs for cache cleanup
    const activeRelationshipIds = new Set<string>()

    for (const nodePair of nodePairs) {
      const middleRelationshipIndex = (nodePair.relationships.length - 1) / 2
      const defaultDeflectionStep = 30
      const maximumTotalDeflection = 150
      const numberOfSteps = nodePair.relationships.length - 1
      const totalDeflection = defaultDeflectionStep * numberOfSteps

      const deflectionStep =
        totalDeflection > maximumTotalDeflection
          ? maximumTotalDeflection / numberOfSteps
          : defaultDeflectionStep

      for (let i = 0; i < nodePair.relationships.length; i++) {
        const relationship = nodePair.relationships[i]
        activeRelationshipIds.add(relationship.id)

        const shaftWidth =
          parseFloat(
            this.style.forRelationship(relationship).get('shaft-width')
          ) || 2
        const headWidth = shaftWidth + 6
        const headHeight = headWidth

        const isLoop = nodePair.isLoop()

        // Calculate deflection for this relationship
        let deflection = 0
        if (!isLoop && i !== middleRelationshipIndex) {
          deflection = deflectionStep * (i - middleRelationshipIndex)
          if (nodePair.nodeA !== relationship.source) {
            deflection *= -1
          }
        }

        // Build cache key from geometry parameters
        const cacheKey: ArrowCacheKey = {
          sourceX: relationship.source.x,
          sourceY: relationship.source.y,
          targetX: relationship.target.x,
          targetY: relationship.target.y,
          sourceRadius: relationship.source.radius,
          targetRadius: relationship.target.radius,
          deflection,
          shaftWidth,
          captionLayout: relationship.captionLayout,
          isLoop
        }

        // Only recreate arrow if geometry actually changed
        if (this.arrowNeedsRecreation(relationship.id, cacheKey)) {
          let arrow: ArcArrow | LoopArrow | StraightArrow

          if (isLoop) {
            arrow = new LoopArrow(
              relationship.source.radius,
              40,
              defaultDeflectionStep,
              shaftWidth,
              headWidth,
              headHeight,
              relationship.captionHeight
            )
          } else if (i === middleRelationshipIndex) {
            arrow = new StraightArrow(
              relationship.source.radius,
              relationship.target.radius,
              relationship.centreDistance,
              shaftWidth,
              headWidth,
              headHeight,
              relationship.captionLayout
            )
          } else {
            arrow = new ArcArrow(
              relationship.source.radius,
              relationship.target.radius,
              relationship.centreDistance,
              deflection,
              shaftWidth,
              headWidth,
              headHeight,
              relationship.captionLayout
            )
          }

          // Store in cache and assign to relationship
          this.arrowCache.set(relationship.id, { key: cacheKey, arrow })
          relationship.arrow = arrow
        } else {
          // Reuse cached arrow instance
          relationship.arrow = this.arrowCache.get(relationship.id)!.arrow
        }

        ;[relationship.shortCaption, relationship.shortCaptionLength] =
          relationship.arrow.shaftLength > relationship.captionLength
            ? [relationship.caption, relationship.captionLength]
            : this.shortenCaption(
                relationship,
                relationship.caption,
                relationship.arrow.shaftLength
              )
      }
    }

    // Clean up cache entries for removed relationships
    for (const relId of this.arrowCache.keys()) {
      if (!activeRelationshipIds.has(relId)) {
        this.arrowCache.delete(relId)
      }
    }
  }

  // Clear the arrow cache - should be called when graph structure changes significantly
  clearArrowCache(): void {
    this.arrowCache.clear()
  }
}
