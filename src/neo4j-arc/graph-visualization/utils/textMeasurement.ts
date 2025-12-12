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

const CACHE_SIZE = 100000

// Singleton cache instance at module level
const textMeasureCache: Map<string, number> = new Map()
const lruKeyList: string[] = []

const measureTextWidthByCanvas = (
  text: string,
  font: string,
  context: CanvasRenderingContext2D
): number => {
  context.font = font
  return context.measureText(text).width
}

const getCachedWidth = (key: string, calculate: () => number): number => {
  const cached = textMeasureCache.get(key)
  if (cached !== undefined) {
    // Move to end for LRU (only if not already at end)
    const index = lruKeyList.lastIndexOf(key)
    if (index !== -1 && index !== lruKeyList.length - 1) {
      lruKeyList.splice(index, 1)
      lruKeyList.push(key)
    }
    return cached
  }

  const result = calculate()

  // Evict oldest if at capacity (before adding new entry)
  if (lruKeyList.length >= CACHE_SIZE) {
    const oldestKey = lruKeyList.shift()
    if (oldestKey) {
      textMeasureCache.delete(oldestKey)
    }
  }

  textMeasureCache.set(key, result)
  lruKeyList.push(key)

  return result
}

export function measureText(
  text: string,
  fontFamily: string,
  fontSize: number,
  canvas2DContext: CanvasRenderingContext2D
): number {
  const font = `normal normal normal ${fontSize}px/normal ${fontFamily}`
  const cacheKey = `[${font}][${text}]`

  return getCachedWidth(cacheKey, () =>
    measureTextWidthByCanvas(text, font, canvas2DContext)
  )
}

// Export for testing - clears the singleton cache
export function clearTextMeasureCache(): void {
  textMeasureCache.clear()
  lruKeyList.length = 0
}
