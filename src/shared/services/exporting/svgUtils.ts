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
import { select as d3Select, Selection } from 'd3-selection'

export type ExportType = 'plan' | 'graph'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface GraphElement {
  boundingBox: () => BoundingBox
}

interface SvgDimensions {
  width: number
  height: number
  viewBox: string
}

type SvgSelection = Selection<SVGSVGElement, unknown, null, undefined>

export const prepareForExport = (
  svgElement: SVGElement,
  graphElement: GraphElement
): SvgSelection => {
  const dimensions = getSvgDimensions(graphElement)
  const svg = d3Select(
    document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  )

  svg.append('title').text('Neo4j Graph Visualization')
  svg.append('desc').text('Created using Neo4j (http://www.neo4j.com/)')

  appendLayers(svgElement, svg)

  svg.selectAll('.overlay, .ring').remove()
  svg.selectAll('.context-menu-item').remove()
  svg
    .selectAll('text')
    .attr('font-family', 'Helvetica Neue, Helvetica, Arial, sans-serif')

  svg.attr('width', dimensions.width)
  svg.attr('height', dimensions.height)
  svg.attr('viewBox', dimensions.viewBox)

  return svg
}

const getSvgDimensions = (graphElement: GraphElement): SvgDimensions => {
  const boundingBox = graphElement.boundingBox()
  return {
    width: boundingBox.width,
    height: boundingBox.height,
    viewBox: [
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height
    ].join(' ')
  }
}

const appendLayers = (
  svgElement: SVGElement,
  svg: SvgSelection
): SvgSelection => {
  const svgNode = svg.node()
  if (!svgNode) {
    return svg
  }

  d3Select(svgElement)
    .selectAll<SVGGElement, unknown>('g.layer')
    .each(function () {
      const clonedNode = d3Select<SVGGElement, unknown>(this)
        .node()
        ?.cloneNode(true)
      if (clonedNode) {
        svgNode.appendChild(clonedNode)
      }
    })

  return svg
}
