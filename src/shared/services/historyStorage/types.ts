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
 * Represents a single history entry stored in IndexedDB
 */
export interface HistoryEntry {
  /** Auto-increment primary key */
  id: number
  /** The query/command text */
  query: string
  /** Unix timestamp when the query was executed */
  timestamp: number
}

/**
 * Configuration for the history storage service
 */
export interface HistoryStorageConfig {
  /** Maximum number of entries to store (default: 1200 for IndexedDB, 100 for localStorage) */
  maxEntries: number
  /** Size of the in-memory LRU cache (default: 100) */
  cacheSize: number
  /** Number of entries to prefetch in each direction during navigation (default: 5) */
  prefetchWindow: number
}

/**
 * Storage mode for history persistence
 */
export type StorageMode = 'indexeddb' | 'localstorage'

/**
 * Redux state shape for history module
 */
export interface HistoryState {
  /** In-memory cache of recent entries for fast navigation */
  cache: HistoryEntry[]
  /** Total number of entries in storage */
  totalCount: number
  /** Current storage mode */
  storageMode: StorageMode
  /** Whether an async operation is in progress */
  isLoading: boolean
  /** Last error message, if any */
  error: string | null
}

/**
 * Provider interface for CypherEditor history navigation
 * This abstraction allows CypherEditor (in neo4j-arc) to access history
 * without directly importing from shared/services
 */
export interface HistoryProvider {
  /** Get the entry at the specified index (0 = most recent). Returns null if not found. */
  getEntry: (index: number) => Promise<string | null>
  /** Get entry synchronously from cache. Returns undefined if not in cache. */
  getEntrySync: (index: number) => string | undefined
  /** Get the total number of entries in storage */
  getTotalCount: () => number
  /** Trigger prefetch of entries around the given index */
  prefetch: (index: number, direction: 'back' | 'forward') => void
  /** Check if an entry is currently in the cache */
  isInCache: (index: number) => boolean
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: HistoryStorageConfig = {
  maxEntries: 1200,
  cacheSize: 100,
  prefetchWindow: 5
}

/**
 * Fallback configuration for localStorage mode
 */
export const LOCALSTORAGE_FALLBACK_CONFIG: Partial<HistoryStorageConfig> = {
  maxEntries: 100
}

/**
 * IndexedDB database configuration
 */
export const INDEXEDDB_CONFIG = {
  databaseName: 'neo4j-browser-history',
  version: 1,
  storeName: 'queries'
} as const
