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
import { NodeModel } from '../../../../models/Node'
import { RelationshipModel } from '../../../../models/Relationship'

const DEFAULT_CELL_SIZE = 100

export type HitResult =
  | { type: 'node'; item: NodeModel }
  | { type: 'relationship'; item: RelationshipModel }
  | null

/**
 * Spatial hash grid for efficient hit detection in large graphs.
 * Groups nodes and relationships into cells based on their positions,
 * allowing O(1) average lookup for hit tests instead of O(n).
 */
export class PixiHitDetection {
  private nodeGrid: Map<string, Set<NodeModel>> = new Map()
  private relGrid: Map<string, Set<RelationshipModel>> = new Map()
  private cellSize: number

  constructor(cellSize: number = DEFAULT_CELL_SIZE) {
    this.cellSize = cellSize
  }

  /**
   * Rebuild the spatial hash grid from scratch.
   * Call this when the graph changes significantly.
   */
  rebuildGrid(nodes: NodeModel[], relationships: RelationshipModel[]): void {
    this.nodeGrid.clear()
    this.relGrid.clear()

    // Index all nodes
    for (const node of nodes) {
      this.addNodeToGrid(node)
    }

    // Index all relationships
    for (const rel of relationships) {
      this.addRelToGrid(rel)
    }
  }

  /**
   * Update positions in grid (for incremental updates during simulation)
   */
  updatePositions(
    nodes: NodeModel[],
    relationships: RelationshipModel[]
  ): void {
    // For now, just rebuild. Could be optimized to track dirty cells.
    this.rebuildGrid(nodes, relationships)
  }

  /**
   * Perform hit test at world coordinates.
   * Returns the topmost element at that position.
   * Nodes take precedence over relationships.
   */
  hitTest(worldX: number, worldY: number): HitResult {
    // First check nodes (they are rendered on top)
    const node = this.hitTestNodes(worldX, worldY)
    if (node) {
      return { type: 'node', item: node }
    }

    // Then check relationships
    const rel = this.hitTestRelationships(worldX, worldY)
    if (rel) {
      return { type: 'relationship', item: rel }
    }

    return null
  }

  /**
   * Test if point hits any node
   */
  private hitTestNodes(worldX: number, worldY: number): NodeModel | null {
    const candidateCells = this.getAdjacentCellKeys(worldX, worldY)

    // Check nodes in nearby cells
    for (const cellKey of candidateCells) {
      const nodesInCell = this.nodeGrid.get(cellKey)
      if (!nodesInCell) continue

      for (const node of nodesInCell) {
        if (this.pointInNode(worldX, worldY, node)) {
          return node
        }
      }
    }

    return null
  }

  /**
   * Test if point hits any relationship
   */
  private hitTestRelationships(
    worldX: number,
    worldY: number
  ): RelationshipModel | null {
    const candidateCells = this.getAdjacentCellKeys(worldX, worldY)

    // Check relationships in nearby cells
    for (const cellKey of candidateCells) {
      const relsInCell = this.relGrid.get(cellKey)
      if (!relsInCell) continue

      for (const rel of relsInCell) {
        if (this.pointNearRelationship(worldX, worldY, rel)) {
          return rel
        }
      }
    }

    return null
  }

  /**
   * Check if point is inside a node (circle test)
   */
  private pointInNode(x: number, y: number, node: NodeModel): boolean {
    const nodeX = node.x ?? 0
    const nodeY = node.y ?? 0
    const radius = node.radius ?? 25

    const dx = x - nodeX
    const dy = y - nodeY
    const distSq = dx * dx + dy * dy

    return distSq <= radius * radius
  }

  /**
   * Check if point is near a relationship line.
   * Uses a simplified distance-to-segment test with tolerance.
   */
  private pointNearRelationship(
    x: number,
    y: number,
    rel: RelationshipModel
  ): boolean {
    const source = rel.source
    const target = rel.target

    // Get source and target positions
    const x1 = source.x ?? 0
    const y1 = source.y ?? 0
    const x2 = target.x ?? 0
    const y2 = target.y ?? 0

    // For self-loops, check distance to source node + offset
    if (source === target) {
      return this.pointNearLoopArrow(x, y, source)
    }

    // Calculate distance from point to line segment
    const tolerance = 10 // pixels
    const dist = this.pointToSegmentDistance(x, y, x1, y1, x2, y2)

    return dist <= tolerance
  }

  /**
   * Check if point is near a self-loop arrow
   */
  private pointNearLoopArrow(x: number, y: number, node: NodeModel): boolean {
    const nodeX = node.x ?? 0
    const nodeY = node.y ?? 0
    const radius = node.radius ?? 25

    // Loop arrows extend above the node
    // Check if point is in the loop region (above the node)
    const loopCenterX = nodeX
    const loopCenterY = nodeY - radius - 20 // Loop is above node

    const dx = x - loopCenterX
    const dy = y - loopCenterY

    // Simple circular region check for the loop area
    const loopRadius = 25
    const distSq = dx * dx + dy * dy

    return distSq <= loopRadius * loopRadius
  }

  /**
   * Calculate minimum distance from a point to a line segment
   */
  private pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1
    const dy = y2 - y1
    const lengthSq = dx * dx + dy * dy

    if (lengthSq === 0) {
      // Segment is a point
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
    }

    // Project point onto line segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq
    t = Math.max(0, Math.min(1, t))

    // Closest point on segment
    const closestX = x1 + t * dx
    const closestY = y1 + t * dy

    return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2)
  }

  /**
   * Add a node to the spatial grid
   */
  private addNodeToGrid(node: NodeModel): void {
    const x = node.x ?? 0
    const y = node.y ?? 0
    const radius = node.radius ?? 25

    // Add to all cells the node overlaps
    const minCellX = Math.floor((x - radius) / this.cellSize)
    const maxCellX = Math.floor((x + radius) / this.cellSize)
    const minCellY = Math.floor((y - radius) / this.cellSize)
    const maxCellY = Math.floor((y + radius) / this.cellSize)

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.getCellKey(cx, cy)
        let cellNodes = this.nodeGrid.get(key)
        if (!cellNodes) {
          cellNodes = new Set()
          this.nodeGrid.set(key, cellNodes)
        }
        cellNodes.add(node)
      }
    }
  }

  /**
   * Add a relationship to the spatial grid
   */
  private addRelToGrid(rel: RelationshipModel): void {
    const source = rel.source
    const target = rel.target

    const x1 = source.x ?? 0
    const y1 = source.y ?? 0
    const x2 = target.x ?? 0
    const y2 = target.y ?? 0

    // Add to all cells the relationship line passes through
    const minX = Math.min(x1, x2)
    const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2)
    const maxY = Math.max(y1, y2)

    const minCellX = Math.floor(minX / this.cellSize)
    const maxCellX = Math.floor(maxX / this.cellSize)
    const minCellY = Math.floor(minY / this.cellSize)
    const maxCellY = Math.floor(maxY / this.cellSize)

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this.getCellKey(cx, cy)
        let cellRels = this.relGrid.get(key)
        if (!cellRels) {
          cellRels = new Set()
          this.relGrid.set(key, cellRels)
        }
        cellRels.add(rel)
      }
    }
  }

  /**
   * Get cell key from cell coordinates
   */
  private getCellKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`
  }

  /**
   * Get keys for the cell at the position and all adjacent cells
   */
  private getAdjacentCellKeys(worldX: number, worldY: number): string[] {
    const cellX = Math.floor(worldX / this.cellSize)
    const cellY = Math.floor(worldY / this.cellSize)

    const keys: string[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        keys.push(this.getCellKey(cellX + dx, cellY + dy))
      }
    }
    return keys
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodeGrid.clear()
    this.relGrid.clear()
  }

  /**
   * Get grid statistics (for debugging)
   */
  getStats(): { nodeCells: number; relCells: number; cellSize: number } {
    return {
      nodeCells: this.nodeGrid.size,
      relCells: this.relGrid.size,
      cellSize: this.cellSize
    }
  }
}
