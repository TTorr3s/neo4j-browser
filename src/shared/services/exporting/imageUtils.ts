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
import { Canvg } from 'canvg'

import { saveAs } from './fileSaver'
import { prepareForExport, ExportType, GraphElement } from './svgUtils'

// Browser canvas limits (conservative estimates for cross-browser compatibility)
const MAX_CANVAS_DIMENSION = 16000 // Max width or height in pixels
const MAX_CANVAS_AREA = 200_000_000 // ~200 million pixels total

const calculateOptimalScale = (
  baseWidth: number,
  baseHeight: number,
  desiredScale: number
): number => {
  let scale = desiredScale

  // Check dimension limits
  const maxDimensionScale = Math.min(
    MAX_CANVAS_DIMENSION / baseWidth,
    MAX_CANVAS_DIMENSION / baseHeight
  )

  // Check area limit
  const area = baseWidth * baseHeight
  const maxAreaScale = Math.sqrt(MAX_CANVAS_AREA / area)

  // Use the most restrictive limit
  const maxAllowedScale = Math.min(maxDimensionScale, maxAreaScale)

  if (scale > maxAllowedScale) {
    console.warn(
      `PNG export: Reducing quality from ${scale.toFixed(1)}x to ${maxAllowedScale.toFixed(1)}x due to browser canvas limits`
    )
    scale = maxAllowedScale
  }

  return Math.max(scale, 1) // At least 1x scale
}

export const downloadPNGFromSVG = async (
  svg: SVGElement,
  graph: GraphElement,
  type: ExportType
): Promise<void> => {
  const svgObj = prepareForExport(svg, graph)
  const svgDefaultWidth = parseInt(svgObj.attr('width'), 10)
  const svgDefaultHeight = parseInt(svgObj.attr('height'), 10)

  const DESIRED_SCALE = 4.0 * window.devicePixelRatio
  const optimalScale = calculateOptimalScale(
    svgDefaultWidth,
    svgDefaultHeight,
    DESIRED_SCALE
  )

  const scaledWidth = Math.floor(svgDefaultWidth * optimalScale)
  const scaledHeight = Math.floor(svgDefaultHeight * optimalScale)

  svgObj.attr('width', scaledWidth)
  svgObj.attr('height', scaledHeight)

  const svgNode = svgObj.node()
  if (!svgNode) {
    return
  }

  const svgData = htmlCharacterRefToNumericalRef(svgNode)

  const canvas = document.createElement('canvas')
  canvas.width = scaledWidth
  canvas.height = scaledHeight
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return
  }

  const canvgInstance = Canvg.fromString(ctx, svgData)
  canvgInstance.resize(
    canvas.width / window.devicePixelRatio,
    canvas.height / window.devicePixelRatio
  )

  try {
    await canvgInstance.render()
    await downloadPNGFromCanvas(canvas, `${type}.png`)
  } catch (error) {
    console.error('Failed to export PNG:', error)
  }
}

const downloadPNGFromCanvas = (
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob && blob.size > 0) {
          saveAs(blob, filename)
            .then(() => resolve())
            .catch(reject)
        } else {
          reject(
            new Error('Failed to create PNG blob - canvas may be too large')
          )
        }
      },
      'image/png',
      1.0
    )
  })
}

export const downloadSVG = async (
  svg: SVGElement,
  graph: GraphElement,
  type: ExportType
): Promise<void> => {
  const svgObj = prepareForExport(svg, graph)
  const svgNode = svgObj.node()

  if (!svgNode) {
    return
  }

  const svgData = htmlCharacterRefToNumericalRef(svgNode)
  await download(`${type}.svg`, 'image/svg+xml;charset=utf-8', svgData)
}

const htmlCharacterRefToNumericalRef = (node: Node): string =>
  new window.XMLSerializer()
    .serializeToString(node)
    .replace(/&nbsp;/g, '&#160;')

const download = async (
  filename: string,
  mime: string,
  data: BlobPart
): Promise<void> => {
  const blob = new Blob([data], { type: mime })
  await saveAs(blob, filename)
}
