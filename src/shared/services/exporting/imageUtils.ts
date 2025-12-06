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

export const downloadPNGFromSVG = async (
  svg: SVGElement,
  graph: GraphElement,
  type: ExportType
): Promise<void> => {
  const svgObj = prepareForExport(svg, graph)
  const svgDefaultWidth = parseInt(svgObj.attr('width'), 10)
  const svgDefaultHeight = parseInt(svgObj.attr('height'), 10)

  const EXTRA_SIZE = 5.0
  const scaledWidth = svgDefaultWidth * window.devicePixelRatio * EXTRA_SIZE
  const scaledHeight = svgDefaultHeight * window.devicePixelRatio * EXTRA_SIZE

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
    await downloadWithDataURI(`${type}.png`, canvas.toDataURL('image/png'))
  } catch {
    /* unhandled */
  }
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

const downloadWithDataURI = async (
  filename: string,
  dataURI: string
): Promise<void> => {
  const [header, encodedData] = dataURI.split(',')
  const isBase64 = header.includes('base64')
  const byteString = isBase64
    ? window.atob(encodedData)
    : decodeURIComponent(encodedData)

  const mimeString = header.split(':')[1].split(';')[0]
  const byteArray = new Uint8Array(byteString.length)

  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i)
  }

  await download(filename, mimeString, byteArray)
}
