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
import { Graphics } from 'pixi.js'

interface Point {
  x: number
  y: number
}

interface ParsedCommand {
  type: 'M' | 'L' | 'A' | 'Z'
  params: number[]
}

interface ArcParams {
  rx: number
  ry: number
  xAxisRotation: number
  largeArcFlag: number
  sweepFlag: number
  x: number
  y: number
}

interface CenterArc {
  cx: number
  cy: number
  rx: number
  ry: number
  startAngle: number
  endAngle: number
  anticlockwise: boolean
}

/**
 * Parses SVG path strings and draws them to PixiJS Graphics objects.
 * Supports M (moveTo), L (lineTo), A (arc), and Z (closePath) commands.
 *
 * The Arrow classes (StraightArrow, ArcArrow, LoopArrow) generate SVG paths
 * that we need to convert to PixiJS Graphics calls.
 */
export class SVGPathParser {
  private cache: Map<string, ParsedCommand[][]> = new Map()
  private static readonly MAX_CACHE_SIZE = 1000

  /**
   * Parse an SVG path string into commands and draw to Graphics
   * @param pathString The SVG path string (e.g., "M 0,0 L 10,10 Z")
   * @param graphics The PixiJS Graphics object to draw to
   * @param fillColor Optional fill color (if undefined, no fill is applied)
   * @param strokeColor Optional stroke color
   * @param strokeWidth Optional stroke width
   */
  drawPath(
    pathString: string,
    graphics: Graphics,
    fillColor?: number,
    strokeColor?: number,
    strokeWidth?: number
  ): void {
    const subPaths = this.parse(pathString)

    for (const commands of subPaths) {
      let currentPos: Point = { x: 0, y: 0 }
      let startPos: Point = { x: 0, y: 0 }

      for (const cmd of commands) {
        switch (cmd.type) {
          case 'M':
            currentPos = { x: cmd.params[0], y: cmd.params[1] }
            startPos = { ...currentPos }
            graphics.moveTo(currentPos.x, currentPos.y)
            break

          case 'L':
            currentPos = { x: cmd.params[0], y: cmd.params[1] }
            graphics.lineTo(currentPos.x, currentPos.y)
            break

          case 'A': {
            const arcParams: ArcParams = {
              rx: cmd.params[0],
              ry: cmd.params[1],
              xAxisRotation: cmd.params[2],
              largeArcFlag: cmd.params[3],
              sweepFlag: cmd.params[4],
              x: cmd.params[5],
              y: cmd.params[6]
            }
            this.drawArc(graphics, currentPos, arcParams)
            currentPos = { x: arcParams.x, y: arcParams.y }
            break
          }

          case 'Z':
            graphics.lineTo(startPos.x, startPos.y)
            graphics.closePath()
            currentPos = startPos
            break
        }
      }
    }

    // Apply stroke if specified
    if (strokeColor !== undefined && strokeWidth !== undefined) {
      graphics.stroke({ color: strokeColor, width: strokeWidth })
    }

    // Apply fill if specified
    if (fillColor !== undefined) {
      graphics.fill({ color: fillColor })
    }
  }

  /**
   * Parse an SVG path string into an array of subpaths (arrays of commands)
   * Multiple M commands create separate subpaths
   */
  parse(pathString: string): ParsedCommand[][] {
    const cached = this.cache.get(pathString)
    if (cached) return cached

    const subPaths: ParsedCommand[][] = []
    let currentSubPath: ParsedCommand[] = []

    // Tokenize the path string
    // Handles both comma-separated and space-separated coordinates
    const tokens = pathString
      .replace(/,/g, ' ')
      .replace(/([MLAZ])/gi, ' $1 ')
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0)

    let i = 0
    while (i < tokens.length) {
      const token = tokens[i].toUpperCase()

      switch (token) {
        case 'M': {
          // Start a new subpath if we have an existing one
          if (currentSubPath.length > 0) {
            subPaths.push(currentSubPath)
            currentSubPath = []
          }
          const x = parseFloat(tokens[++i])
          const y = parseFloat(tokens[++i])
          currentSubPath.push({ type: 'M', params: [x, y] })
          break
        }

        case 'L': {
          const x = parseFloat(tokens[++i])
          const y = parseFloat(tokens[++i])
          currentSubPath.push({ type: 'L', params: [x, y] })
          break
        }

        case 'A': {
          // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
          const rx = parseFloat(tokens[++i])
          const ry = parseFloat(tokens[++i])
          const xAxisRotation = parseFloat(tokens[++i])
          const largeArcFlag = parseFloat(tokens[++i])
          const sweepFlag = parseFloat(tokens[++i])
          const x = parseFloat(tokens[++i])
          const y = parseFloat(tokens[++i])
          currentSubPath.push({
            type: 'A',
            params: [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y]
          })
          break
        }

        case 'Z': {
          currentSubPath.push({ type: 'Z', params: [] })
          break
        }

        default:
          // Skip unknown tokens or handle as implicit lineTo
          // (numbers following L or M without explicit command)
          if (!isNaN(parseFloat(token))) {
            // This could be an implicit lineTo
            const x = parseFloat(token)
            const y = parseFloat(tokens[++i])
            currentSubPath.push({ type: 'L', params: [x, y] })
          }
      }
      i++
    }

    // Push the last subpath
    if (currentSubPath.length > 0) {
      subPaths.push(currentSubPath)
    }

    // Cache management
    if (this.cache.size >= SVGPathParser.MAX_CACHE_SIZE) {
      // Remove oldest entries (first 10%)
      const keysToRemove = Array.from(this.cache.keys()).slice(
        0,
        Math.floor(SVGPathParser.MAX_CACHE_SIZE * 0.1)
      )
      keysToRemove.forEach(key => this.cache.delete(key))
    }
    this.cache.set(pathString, subPaths)

    return subPaths
  }

  /**
   * Draw an SVG elliptical arc to a PixiJS Graphics object
   * Converts from SVG arc endpoint parameterization to center parameterization,
   * then approximates with bezier curves
   *
   * Based on: https://www.w3.org/TR/SVG11/implnote.html#ArcConversionEndpointToCenter
   */
  private drawArc(graphics: Graphics, start: Point, arc: ArcParams): void {
    const {
      rx,
      ry,
      xAxisRotation,
      largeArcFlag,
      sweepFlag,
      x: endX,
      y: endY
    } = arc

    // Handle degenerate cases
    if (rx === 0 || ry === 0) {
      graphics.lineTo(endX, endY)
      return
    }

    // Same point - no arc needed
    if (start.x === endX && start.y === endY) {
      return
    }

    // Convert to center parameterization
    const centerArc = this.endpointToCenterArc(
      start.x,
      start.y,
      rx,
      ry,
      xAxisRotation,
      largeArcFlag,
      sweepFlag,
      endX,
      endY
    )

    if (!centerArc) {
      graphics.lineTo(endX, endY)
      return
    }

    // For circular arcs (rx === ry), we can use arc directly
    // For elliptical arcs, we need to use bezier approximation
    if (Math.abs(centerArc.rx - centerArc.ry) < 0.001 && xAxisRotation === 0) {
      graphics.arc(
        centerArc.cx,
        centerArc.cy,
        centerArc.rx,
        centerArc.startAngle,
        centerArc.endAngle,
        centerArc.anticlockwise
      )
    } else {
      // Approximate elliptical arc with bezier curves
      this.drawEllipticalArcWithBezier(graphics, centerArc, xAxisRotation)
    }
  }

  /**
   * Convert SVG endpoint arc parameterization to center parameterization
   */
  private endpointToCenterArc(
    x1: number,
    y1: number,
    rx: number,
    ry: number,
    phi: number,
    fA: number,
    fS: number,
    x2: number,
    y2: number
  ): CenterArc | null {
    const TAU = Math.PI * 2

    // Convert angle to radians
    const phiRad = (phi * Math.PI) / 180

    // Step 1: Compute (x1', y1')
    const cosPhi = Math.cos(phiRad)
    const sinPhi = Math.sin(phiRad)
    const dx = (x1 - x2) / 2
    const dy = (y1 - y2) / 2
    const x1p = cosPhi * dx + sinPhi * dy
    const y1p = -sinPhi * dx + cosPhi * dy

    // Ensure radii are positive
    let rxp = Math.abs(rx)
    let ryp = Math.abs(ry)

    // Correct out-of-range radii
    const x1p2 = x1p * x1p
    const y1p2 = y1p * y1p
    const rx2 = rxp * rxp
    const ry2 = ryp * ryp

    const lambda = x1p2 / rx2 + y1p2 / ry2
    if (lambda > 1) {
      const sqrtLambda = Math.sqrt(lambda)
      rxp *= sqrtLambda
      ryp *= sqrtLambda
    }

    // Step 2: Compute (cx', cy')
    const rxp2 = rxp * rxp
    const ryp2 = ryp * ryp

    let sq =
      (rxp2 * ryp2 - rxp2 * y1p2 - ryp2 * x1p2) / (rxp2 * y1p2 + ryp2 * x1p2)
    sq = Math.max(0, sq) // Clamp to avoid sqrt of negative

    let coef = Math.sqrt(sq)
    if (fA === fS) {
      coef = -coef
    }

    const cxp = (coef * rxp * y1p) / ryp
    const cyp = (-coef * ryp * x1p) / rxp

    // Step 3: Compute (cx, cy) from (cx', cy')
    const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
    const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

    // Step 4: Compute theta1 and dtheta
    const ux = (x1p - cxp) / rxp
    const uy = (y1p - cyp) / ryp
    const vx = (-x1p - cxp) / rxp
    const vy = (-y1p - cyp) / ryp

    // Compute angle start
    const n = Math.sqrt(ux * ux + uy * uy)
    const p = ux
    let theta1 = Math.acos(Math.max(-1, Math.min(1, p / n)))
    if (uy < 0) {
      theta1 = -theta1
    }

    // Compute angle extent
    const n2 = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy))
    const p2 = ux * vx + uy * vy
    let dtheta = Math.acos(Math.max(-1, Math.min(1, p2 / n2)))
    if (ux * vy - uy * vx < 0) {
      dtheta = -dtheta
    }

    // Adjust based on sweep flag
    if (fS === 0 && dtheta > 0) {
      dtheta -= TAU
    } else if (fS === 1 && dtheta < 0) {
      dtheta += TAU
    }

    return {
      cx,
      cy,
      rx: rxp,
      ry: ryp,
      startAngle: theta1,
      endAngle: theta1 + dtheta,
      anticlockwise: dtheta < 0
    }
  }

  /**
   * Draw an elliptical arc using bezier curve approximation
   */
  private drawEllipticalArcWithBezier(
    graphics: Graphics,
    arc: CenterArc,
    xAxisRotationDeg: number
  ): void {
    const { cx, cy, rx, ry, startAngle, endAngle, anticlockwise } = arc
    const xAxisRotation = (xAxisRotationDeg * Math.PI) / 180

    // Calculate the number of segments needed
    // More segments = smoother curve
    let sweepAngle = endAngle - startAngle
    if (anticlockwise && sweepAngle > 0) {
      sweepAngle -= Math.PI * 2
    } else if (!anticlockwise && sweepAngle < 0) {
      sweepAngle += Math.PI * 2
    }

    const numSegments = Math.ceil(Math.abs(sweepAngle) / (Math.PI / 4))
    const segmentAngle = sweepAngle / numSegments

    const cosPhi = Math.cos(xAxisRotation)
    const sinPhi = Math.sin(xAxisRotation)

    // Helper to compute ellipse point
    const ellipsePoint = (angle: number): Point => {
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      return {
        x: cx + cosPhi * rx * cosA - sinPhi * ry * sinA,
        y: cy + sinPhi * rx * cosA + cosPhi * ry * sinA
      }
    }

    // Compute bezier control points for each segment
    for (let i = 0; i < numSegments; i++) {
      const a1 = startAngle + i * segmentAngle
      const a2 = a1 + segmentAngle

      // Control point distance
      const alpha = (4 / 3) * Math.tan(segmentAngle / 4)

      const p1 = ellipsePoint(a1)
      const p2 = ellipsePoint(a2)

      // Derivative at angle
      const deriv1 = {
        x: -rx * Math.sin(a1),
        y: ry * Math.cos(a1)
      }
      const deriv2 = {
        x: -rx * Math.sin(a2),
        y: ry * Math.cos(a2)
      }

      // Rotate derivatives
      const d1 = {
        x: cosPhi * deriv1.x - sinPhi * deriv1.y,
        y: sinPhi * deriv1.x + cosPhi * deriv1.y
      }
      const d2 = {
        x: cosPhi * deriv2.x - sinPhi * deriv2.y,
        y: sinPhi * deriv2.x + cosPhi * deriv2.y
      }

      // Control points
      const cp1 = {
        x: p1.x + alpha * d1.x,
        y: p1.y + alpha * d1.y
      }
      const cp2 = {
        x: p2.x - alpha * d2.x,
        y: p2.y - alpha * d2.y
      }

      graphics.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y)
    }
  }

  /**
   * Clear the parse cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }
}
