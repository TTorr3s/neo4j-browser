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
import { Sprite, Texture } from 'pixi.js'

const DEFAULT_FONT_FAMILY = 'sans-serif'
const MAX_CACHE_SIZE = 5000
const TEXTURE_SCALE = 2 // Higher resolution for crisp text

interface CacheEntry {
  texture: Texture
  lastUsed: number
}

/**
 * Renders text to Canvas and caches as PixiJS textures
 * Uses LRU eviction when cache exceeds MAX_CACHE_SIZE
 */
export class PixiTextRenderer {
  private textureCache: Map<string, CacheEntry> = new Map()
  private offscreenCanvas: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D

  constructor() {
    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!
  }

  /**
   * Get or create a texture for the given text
   */
  getTextTexture(
    text: string,
    fontSize: number,
    color: string,
    fontFamily: string = DEFAULT_FONT_FAMILY
  ): Texture {
    const cacheKey = this.getCacheKey(text, fontSize, color, fontFamily)

    // Check cache
    const cached = this.textureCache.get(cacheKey)
    if (cached) {
      cached.lastUsed = Date.now()
      return cached.texture
    }

    // Create new texture
    const texture = this.renderTextToTexture(text, fontSize, color, fontFamily)

    // Add to cache with LRU eviction
    this.addToCache(cacheKey, texture)

    return texture
  }

  /**
   * Create a Sprite with the text texture
   */
  createTextSprite(
    text: string,
    fontSize: number,
    color: string,
    fontFamily: string = DEFAULT_FONT_FAMILY
  ): Sprite {
    const texture = this.getTextTexture(text, fontSize, color, fontFamily)
    const sprite = new Sprite(texture)

    // Scale down since we rendered at higher resolution
    sprite.scale.set(1 / TEXTURE_SCALE)

    return sprite
  }

  /**
   * Render text to a texture using Canvas 2D
   */
  private renderTextToTexture(
    text: string,
    fontSize: number,
    color: string,
    fontFamily: string
  ): Texture {
    const ctx = this.offscreenCtx
    const scaledFontSize = fontSize * TEXTURE_SCALE

    // Set font to measure
    ctx.font = `${scaledFontSize}px ${fontFamily}`
    const metrics = ctx.measureText(text)

    // Calculate canvas size with padding
    const padding = 4 * TEXTURE_SCALE
    const width = Math.ceil(metrics.width) + padding * 2
    const height = Math.ceil(scaledFontSize * 1.2) + padding * 2

    // Resize canvas
    this.offscreenCanvas.width = width
    this.offscreenCanvas.height = height

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, width, height)

    // Set text style
    ctx.font = `${scaledFontSize}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw text centered
    ctx.fillText(text, width / 2, height / 2)

    // Create texture from canvas - PixiJS v8 API
    // We need to clone the canvas data since Texture.from reuses the source
    const imageData = ctx.getImageData(0, 0, width, height)
    const clonedCanvas = document.createElement('canvas')
    clonedCanvas.width = width
    clonedCanvas.height = height
    const clonedCtx = clonedCanvas.getContext('2d')!
    clonedCtx.putImageData(imageData, 0, 0)

    return Texture.from(clonedCanvas)
  }

  /**
   * Generate cache key
   */
  private getCacheKey(
    text: string,
    fontSize: number,
    color: string,
    fontFamily: string
  ): string {
    return `${text}|${fontSize}|${color}|${fontFamily}`
  }

  /**
   * Add texture to cache with LRU eviction
   */
  private addToCache(key: string, texture: Texture): void {
    // Evict oldest entries if cache is full
    if (this.textureCache.size >= MAX_CACHE_SIZE) {
      this.evictOldest(Math.floor(MAX_CACHE_SIZE * 0.1)) // Evict 10%
    }

    this.textureCache.set(key, {
      texture,
      lastUsed: Date.now()
    })
  }

  /**
   * Evict oldest entries from cache
   */
  private evictOldest(count: number): void {
    // Sort entries by lastUsed
    const entries = Array.from(this.textureCache.entries()).sort(
      (a, b) => a[1].lastUsed - b[1].lastUsed
    )

    // Remove oldest entries
    for (let i = 0; i < count && i < entries.length; i++) {
      const [key, entry] = entries[i]
      entry.texture.destroy(true)
      this.textureCache.delete(key)
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    for (const entry of this.textureCache.values()) {
      entry.texture.destroy(true)
    }
    this.textureCache.clear()
  }

  /**
   * Get current cache size
   */
  getCacheSize(): number {
    return this.textureCache.size
  }

  /**
   * Destroy renderer and free all resources
   */
  destroy(): void {
    this.clearCache()
  }
}
