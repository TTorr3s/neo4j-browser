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

/**
 * Generic LRU (Least Recently Used) Cache implementation using Map.
 *
 * Map maintains insertion order, so we leverage this for efficient O(1)
 * LRU operations by re-inserting accessed entries to move them to the end
 * (most recently used position).
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string>(100)
 * cache.set(0, 'MATCH (n) RETURN n')
 * cache.get(0) // Returns 'MATCH (n) RETURN n'
 * ```
 */
export class LRUCache<T> {
  private readonly maxSize: number
  private readonly cache: Map<number, T>

  /**
   * Creates a new LRU cache with the specified maximum size.
   * @param maxSize - Maximum number of entries the cache can hold
   */
  constructor(maxSize: number) {
    if (maxSize < 1) {
      throw new Error('LRUCache maxSize must be at least 1')
    }
    this.maxSize = maxSize
    this.cache = new Map<number, T>()
  }

  /**
   * Gets the value associated with the key and moves it to the most recently used position.
   * @param key - The history index to look up
   * @returns The value if found, undefined otherwise
   */
  get(key: number): T | undefined {
    const value = this.cache.get(key)
    if (value === undefined) {
      return undefined
    }

    // Move to most recently used position by re-inserting
    this.cache.delete(key)
    this.cache.set(key, value)

    return value
  }

  /**
   * Sets a value in the cache. If the cache is at capacity, evicts the least recently used entry.
   * @param key - The history index
   * @param value - The value to store
   */
  set(key: number, value: T): void {
    // If key already exists, delete it first to update its position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Evict the least recently used entry (first entry in Map)
      const lruKey = this.cache.keys().next().value
      if (lruKey !== undefined) {
        this.cache.delete(lruKey)
      }
    }

    this.cache.set(key, value)
  }

  /**
   * Checks if a key exists in the cache without updating its position.
   * @param key - The history index to check
   * @returns True if the key exists, false otherwise
   */
  has(key: number): boolean {
    return this.cache.has(key)
  }

  /**
   * Removes an entry from the cache.
   * @param key - The history index to remove
   * @returns True if the entry was removed, false if it didn't exist
   */
  delete(key: number): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clears all entries from the cache.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Gets multiple entries at once within a range.
   * Does not update the position of accessed entries.
   * @param start - Start index (inclusive)
   * @param end - End index (inclusive)
   * @returns A Map containing all found entries within the range
   */
  getRange(start: number, end: number): Map<number, T> {
    const result = new Map<number, T>()
    const [minKey, maxKey] = start <= end ? [start, end] : [end, start]

    for (const [key, value] of this.cache) {
      if (key >= minKey && key <= maxKey) {
        result.set(key, value)
      }
    }

    return result
  }

  /**
   * Returns the current number of entries in the cache.
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Returns an iterator over all cache entries in order from least to most recently used.
   * @returns An iterable iterator of [key, value] pairs
   */
  entries(): IterableIterator<[number, T]> {
    return this.cache.entries()
  }
}
