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

import {
  DEFAULT_CONFIG,
  HistoryEntry,
  HistoryStorageConfig,
  LOCALSTORAGE_FALLBACK_CONFIG,
  StorageMode
} from './types'
import { LRUCache } from './lruCache'
import {
  addEntry as idbAddEntry,
  clear as idbClear,
  closeDatabase,
  deleteOldestEntries,
  getAllEntries as idbGetAllEntries,
  getCount,
  getEntry as idbGetEntry,
  getLatestEntries as idbGetLatestEntries,
  isIndexedDBAvailable,
  openDatabase
} from './indexedDBStorage'

const LOCALSTORAGE_KEY = 'neo4j.history-fallback'

/**
 * Unified history storage service that abstracts IndexedDB with localStorage fallback.
 *
 * This singleton service provides:
 * - Automatic IndexedDB/localStorage fallback
 * - LRU caching for fast history navigation
 * - Index-to-ID mapping (index 0 = most recent entry)
 * - Prefetching for smooth navigation experience
 *
 * @example
 * ```typescript
 * const service = HistoryStorageService.getInstance()
 * await service.initialize()
 * await service.addEntry('MATCH (n) RETURN n')
 * const query = await service.getEntryByIndex(0) // Most recent
 * ```
 */
export class HistoryStorageService {
  private static instance: HistoryStorageService | null = null

  private db: IDBDatabase | null = null
  private storageMode: StorageMode = 'indexeddb'
  private config: HistoryStorageConfig
  private cache: LRUCache<string>
  private totalCount: number = 0
  private initialized: boolean = false

  /**
   * Maps navigation index (0 = most recent) to IndexedDB id.
   * This mapping is built from the order of entries sorted by id DESC.
   */
  private idMapping: Map<number, number> = new Map()

  private constructor() {
    this.config = { ...DEFAULT_CONFIG }
    this.cache = new LRUCache<string>(this.config.cacheSize)
  }

  /**
   * Gets the singleton instance of the HistoryStorageService.
   */
  static getInstance(): HistoryStorageService {
    if (!HistoryStorageService.instance) {
      HistoryStorageService.instance = new HistoryStorageService()
    }
    return HistoryStorageService.instance
  }

  /**
   * Initializes the storage service.
   * Attempts to open IndexedDB, falls back to localStorage if unavailable.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      const idbAvailable = isIndexedDBAvailable()
      if (idbAvailable) {
        this.db = await openDatabase()
        this.storageMode = 'indexeddb'
        // Deduplicate entries on startup to clean up any duplicates from previous bugs
        await this.deduplicateEntries()
        await this.refreshCount()
        await this.buildIdMapping()
      } else {
        this.initLocalStorageFallback()
      }
      this.initialized = true
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to initialize, falling back to localStorage:',
        error
      )
      this.initLocalStorageFallback()
      this.initialized = true
    }
  }

  /**
   * Initializes localStorage fallback mode.
   */
  private initLocalStorageFallback(): void {
    this.storageMode = 'localstorage'
    this.config = {
      ...this.config,
      ...LOCALSTORAGE_FALLBACK_CONFIG
    }
    this.loadFromLocalStorage()
  }

  /**
   * Loads history data from localStorage and populates the cache.
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(LOCALSTORAGE_KEY)
      if (stored) {
        const entries: string[] = JSON.parse(stored)
        this.totalCount = entries.length
        // Populate cache with available entries (entries are stored newest first)
        entries.slice(0, this.config.cacheSize).forEach((query, index) => {
          this.cache.set(index, query)
        })
      } else {
        this.totalCount = 0
      }
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to load from localStorage:',
        error
      )
      this.totalCount = 0
    }
  }

  /**
   * Saves history data to localStorage.
   */
  private saveToLocalStorage(entries: string[]): void {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(entries))
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to save to localStorage:',
        error
      )
    }
  }

  /**
   * Gets the current entries from localStorage.
   */
  private getLocalStorageEntries(): string[] {
    try {
      const stored = localStorage.getItem(LOCALSTORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to read from localStorage:',
        error
      )
      return []
    }
  }

  /**
   * Builds the index-to-ID mapping from IndexedDB entries.
   * Index 0 corresponds to the entry with the highest ID (most recent).
   */
  private async buildIdMapping(): Promise<void> {
    if (!this.db || this.storageMode !== 'indexeddb') {
      return
    }

    try {
      // Get all entries sorted by id DESC (newest first)
      const entries = await idbGetAllEntries(this.db)
      this.idMapping.clear()
      entries.forEach((entry, index) => {
        this.idMapping.set(index, entry.id)
      })
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to build ID mapping:',
        error
      )
    }
  }

  /**
   * Removes duplicate entries from IndexedDB, keeping only the most recent occurrence of each query.
   * This is called during initialization to clean up any duplicates from previous bugs.
   */
  private async deduplicateEntries(): Promise<void> {
    if (!this.db || this.storageMode !== 'indexeddb') {
      return
    }

    try {
      const allEntries = await idbGetAllEntries(this.db)
      if (allEntries.length === 0) {
        return
      }

      // Track seen queries and entries to delete
      const seenQueries = new Set<string>()
      const idsToDelete: number[] = []

      // Entries are sorted by id DESC (newest first)
      // Keep the first occurrence (newest) of each query
      for (const entry of allEntries) {
        if (seenQueries.has(entry.query)) {
          idsToDelete.push(entry.id)
        } else {
          seenQueries.add(entry.query)
        }
      }

      if (idsToDelete.length > 0) {
        // Delete duplicates using a transaction
        const transaction = this.db.transaction(['queries'], 'readwrite')
        const store = transaction.objectStore('queries')

        for (const id of idsToDelete) {
          store.delete(id)
        }

        await new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve()
          transaction.onerror = () =>
            reject(new Error('Failed to delete duplicates'))
        })
      }
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to deduplicate entries:',
        error
      )
    }
  }

  /**
   * Returns the current storage mode.
   */
  getStorageMode(): StorageMode {
    return this.storageMode
  }

  /**
   * Adds a new entry to history storage.
   * Enforces the maxEntries limit by removing oldest entries if necessary.
   *
   * @param query - The query string to add
   * @returns The ID of the new entry (or the new total count for localStorage)
   */
  async addEntry(query: string): Promise<number> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (this.storageMode === 'localstorage') {
      return this.addEntryLocalStorage(query)
    }

    return this.addEntryIndexedDB(query)
  }

  /**
   * Adds an entry to IndexedDB storage.
   */
  private async addEntryIndexedDB(query: string): Promise<number> {
    if (!this.db) {
      console.error('[HistoryStorageService] Database not initialized')
      return -1
    }

    try {
      // Check if we need to delete oldest entries to stay within limit
      const currentCount = await getCount(this.db)
      if (currentCount >= this.config.maxEntries) {
        const toDelete = currentCount - this.config.maxEntries + 1
        await deleteOldestEntries(this.db, toDelete)
      }

      // Add the new entry
      const newId = await idbAddEntry(this.db, query)

      // Update the cache: new entry becomes index 0
      // Shift all existing cache entries by 1
      const newCache = new LRUCache<string>(this.config.cacheSize)
      newCache.set(0, query)
      for (const [key, value] of this.cache.entries()) {
        if (key + 1 < this.config.cacheSize) {
          newCache.set(key + 1, value)
        }
      }
      this.cache = newCache

      // Update the ID mapping: shift all indices by 1
      const newMapping = new Map<number, number>()
      newMapping.set(0, newId)
      for (const [index, id] of this.idMapping) {
        newMapping.set(index + 1, id)
      }
      this.idMapping = newMapping

      // Update total count
      this.totalCount = Math.min(currentCount + 1, this.config.maxEntries)

      return newId
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to add entry to IndexedDB:',
        error
      )
      return -1
    }
  }

  /**
   * Adds an entry to localStorage storage.
   */
  private addEntryLocalStorage(query: string): number {
    try {
      const entries = this.getLocalStorageEntries()

      // Add new entry at the beginning (most recent)
      entries.unshift(query)

      // Enforce maxEntries limit
      if (entries.length > this.config.maxEntries) {
        entries.splice(this.config.maxEntries)
      }

      this.saveToLocalStorage(entries)
      this.totalCount = entries.length

      // Update cache: new entry becomes index 0
      const newCache = new LRUCache<string>(this.config.cacheSize)
      newCache.set(0, query)
      for (const [key, value] of this.cache.entries()) {
        if (key + 1 < this.config.cacheSize) {
          newCache.set(key + 1, value)
        }
      }
      this.cache = newCache

      return this.totalCount
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to add entry to localStorage:',
        error
      )
      return -1
    }
  }

  /**
   * Gets an entry by its navigation index (0 = most recent).
   * Uses LRU cache for fast access.
   *
   * @param index - The navigation index (0 = most recent)
   * @returns The query string or null if not found
   */
  async getEntryByIndex(index: number): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (index < 0 || index >= this.totalCount) {
      return null
    }

    // Check cache first
    const cached = this.cache.get(index)
    if (cached !== undefined) {
      return cached
    }

    // Fetch from storage
    if (this.storageMode === 'localstorage') {
      return this.getEntryFromLocalStorage(index)
    }

    return this.getEntryFromIndexedDB(index)
  }

  /**
   * Gets an entry from IndexedDB by navigation index.
   */
  private async getEntryFromIndexedDB(index: number): Promise<string | null> {
    if (!this.db) {
      return null
    }

    try {
      const id = this.idMapping.get(index)
      if (id === undefined) {
        // ID mapping may be stale, rebuild it
        await this.buildIdMapping()
        const newId = this.idMapping.get(index)
        if (newId === undefined) {
          return null
        }
        return this.fetchAndCacheEntry(index, newId)
      }

      return this.fetchAndCacheEntry(index, id)
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to get entry from IndexedDB:',
        error
      )
      return null
    }
  }

  /**
   * Fetches an entry from IndexedDB and caches it.
   */
  private async fetchAndCacheEntry(
    index: number,
    id: number
  ): Promise<string | null> {
    if (!this.db) {
      return null
    }

    const entry = await idbGetEntry(this.db, id)
    if (entry) {
      this.cache.set(index, entry.query)
      return entry.query
    }
    return null
  }

  /**
   * Gets an entry from localStorage by navigation index.
   */
  private getEntryFromLocalStorage(index: number): string | null {
    try {
      const entries = this.getLocalStorageEntries()
      if (index >= 0 && index < entries.length) {
        const query = entries[index]
        this.cache.set(index, query)
        return query
      }
      return null
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to get entry from localStorage:',
        error
      )
      return null
    }
  }

  /**
   * Gets an entry by index synchronously from cache only.
   * Returns undefined if the entry is not in cache.
   *
   * @param index - The navigation index (0 = most recent)
   * @returns The query string or undefined if not in cache
   */
  getEntryByIndexSync(index: number): string | undefined {
    if (index < 0 || index >= this.totalCount) {
      return undefined
    }
    return this.cache.get(index)
  }

  /**
   * Prefetches entries around the given index for smoother navigation.
   *
   * @param index - The current navigation index
   * @param direction - The direction of navigation ('back' for older, 'forward' for newer)
   */
  async prefetch(index: number, direction: 'back' | 'forward'): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    const window = this.config.prefetchWindow
    let start: number
    let end: number

    if (direction === 'back') {
      // Prefetch older entries (higher indices)
      start = index
      end = Math.min(index + window, this.totalCount - 1)
    } else {
      // Prefetch newer entries (lower indices)
      start = Math.max(index - window, 0)
      end = index
    }

    // Fetch entries that aren't in cache
    const fetchPromises: Promise<void>[] = []
    for (let i = start; i <= end; i++) {
      if (!this.cache.has(i)) {
        fetchPromises.push(
          this.getEntryByIndex(i).then(() => {
            // Entry is now in cache, nothing else to do
          })
        )
      }
    }

    try {
      await Promise.all(fetchPromises)
    } catch (error) {
      console.error('[HistoryStorageService] Prefetch failed:', error)
    }
  }

  /**
   * Checks if an entry at the given index is currently in the cache.
   *
   * @param index - The navigation index to check
   * @returns True if the entry is in cache
   */
  isInCache(index: number): boolean {
    return this.cache.has(index)
  }

  /**
   * Returns the cached total count of history entries.
   */
  getTotalCount(): number {
    return this.totalCount
  }

  /**
   * Refreshes the total count from storage.
   *
   * @returns The updated total count
   */
  async refreshCount(): Promise<number> {
    // Note: Don't call initialize() here - this method is called during initialization
    // If not initialized, just return current count (0)
    if (!this.initialized && !this.db) {
      return this.totalCount
    }

    if (this.storageMode === 'localstorage') {
      const entries = this.getLocalStorageEntries()
      this.totalCount = entries.length
      return this.totalCount
    }

    if (!this.db) {
      return this.totalCount
    }

    try {
      this.totalCount = await getCount(this.db)
      return this.totalCount
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to refresh count from IndexedDB:',
        error
      )
      return this.totalCount
    }
  }

  /**
   * Gets the N most recent entries.
   *
   * @param count - Number of entries to retrieve
   * @returns Array of history entries, newest first
   */
  async getLatestEntries(count: number): Promise<HistoryEntry[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (count <= 0) {
      return []
    }

    if (this.storageMode === 'localstorage') {
      return this.getLatestEntriesLocalStorage(count)
    }

    return this.getLatestEntriesIndexedDB(count)
  }

  /**
   * Gets latest entries from IndexedDB.
   */
  private async getLatestEntriesIndexedDB(
    count: number
  ): Promise<HistoryEntry[]> {
    if (!this.db) {
      return []
    }

    try {
      const entries = await idbGetLatestEntries(this.db, count)

      // Update cache with fetched entries
      entries.forEach((entry, index) => {
        this.cache.set(index, entry.query)
        this.idMapping.set(index, entry.id)
      })

      return entries
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to get latest entries from IndexedDB:',
        error
      )
      return []
    }
  }

  /**
   * Gets latest entries from localStorage.
   */
  private getLatestEntriesLocalStorage(count: number): HistoryEntry[] {
    try {
      const entries = this.getLocalStorageEntries()
      const result: HistoryEntry[] = []
      const now = Date.now()

      for (let i = 0; i < Math.min(count, entries.length); i++) {
        result.push({
          id: i,
          query: entries[i],
          timestamp: now - i // Fake timestamps, newest first
        })
        this.cache.set(i, entries[i])
      }

      return result
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to get latest entries from localStorage:',
        error
      )
      return []
    }
  }

  /**
   * Gets all history entries.
   *
   * @returns Array of all history entries, newest first
   */
  async getAllEntries(): Promise<HistoryEntry[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (this.storageMode === 'localstorage') {
      return this.getAllEntriesLocalStorage()
    }

    return this.getAllEntriesIndexedDB()
  }

  /**
   * Gets all entries from IndexedDB.
   */
  private async getAllEntriesIndexedDB(): Promise<HistoryEntry[]> {
    if (!this.db) {
      return []
    }

    try {
      const entries = await idbGetAllEntries(this.db)

      // Update cache and ID mapping with fetched entries
      entries.forEach((entry, index) => {
        this.cache.set(index, entry.query)
        this.idMapping.set(index, entry.id)
      })

      return entries
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to get all entries from IndexedDB:',
        error
      )
      return []
    }
  }

  /**
   * Gets all entries from localStorage.
   */
  private getAllEntriesLocalStorage(): HistoryEntry[] {
    try {
      const entries = this.getLocalStorageEntries()
      const now = Date.now()

      return entries.map((query, index) => {
        this.cache.set(index, query)
        return {
          id: index,
          query,
          timestamp: now - index // Fake timestamps, newest first
        }
      })
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to get all entries from localStorage:',
        error
      )
      return []
    }
  }

  /**
   * Clears all history entries.
   */
  async clear(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    this.cache.clear()
    this.idMapping.clear()
    this.totalCount = 0

    if (this.storageMode === 'localstorage') {
      try {
        localStorage.removeItem(LOCALSTORAGE_KEY)
      } catch (error) {
        console.error(
          '[HistoryStorageService] Failed to clear localStorage:',
          error
        )
      }
      return
    }

    if (!this.db) {
      return
    }

    try {
      await idbClear(this.db)
    } catch (error) {
      console.error('[HistoryStorageService] Failed to clear IndexedDB:', error)
    }
  }

  /**
   * Migrates existing localStorage history data to IndexedDB.
   * Only performs migration if currently in IndexedDB mode.
   *
   * @param legacyHistory - Array of query strings from localStorage (newest first)
   */
  async migrateFromLocalStorage(legacyHistory: string[]): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (this.storageMode !== 'indexeddb' || !this.db) {
      console.warn(
        '[HistoryStorageService] Cannot migrate: not in IndexedDB mode'
      )
      return
    }

    if (!legacyHistory || legacyHistory.length === 0) {
      return
    }

    try {
      // Reverse the array so oldest entries are added first
      // This ensures the newest entry gets the highest ID
      const reversed = [...legacyHistory].reverse()

      // Limit to maxEntries
      const toMigrate = reversed.slice(
        Math.max(0, reversed.length - this.config.maxEntries)
      )

      for (const query of toMigrate) {
        await idbAddEntry(this.db, query)
      }

      // Rebuild state after migration
      await this.refreshCount()
      await this.buildIdMapping()
      this.cache.clear()

      console.info(
        `[HistoryStorageService] Migrated ${toMigrate.length} entries from localStorage`
      )
    } catch (error) {
      console.error(
        '[HistoryStorageService] Failed to migrate from localStorage:',
        error
      )
    }
  }

  /**
   * Closes the database connection and cleans up resources.
   */
  close(): void {
    if (this.db) {
      closeDatabase(this.db)
      this.db = null
    }
    this.cache.clear()
    this.idMapping.clear()
    this.totalCount = 0
    this.initialized = false
  }

  /**
   * Resets the singleton instance (primarily for testing).
   */
  static resetInstance(): void {
    if (HistoryStorageService.instance) {
      HistoryStorageService.instance.close()
      HistoryStorageService.instance = null
    }
  }
}
