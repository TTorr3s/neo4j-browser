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
  clear,
  closeDatabase,
  getRecentEntries,
  getTopEntries,
  isIndexedDBAvailable,
  openDatabase,
  upsertEntry
} from './indexedDBStorage'
import { QueryStat } from './types'

/**
 * Singleton service for managing query execution statistics in IndexedDB.
 *
 * Tracks how many times each query has been executed and when it was last run.
 * Provides top-N and recent-N query lookups for the favorites sidebar.
 *
 * Graceful degradation: all methods catch errors internally and never throw,
 * ensuring query execution is never blocked by stats tracking failures.
 */
export class QueryStatsStorageService {
  private static instance: QueryStatsStorageService | null = null

  private db: IDBDatabase | null = null
  private initialized: boolean = false

  private constructor() {}

  static getInstance(): QueryStatsStorageService {
    if (!QueryStatsStorageService.instance) {
      QueryStatsStorageService.instance = new QueryStatsStorageService()
    }
    return QueryStatsStorageService.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      if (!isIndexedDBAvailable()) {
        console.warn(
          '[QueryStatsStorageService] IndexedDB not available, stats tracking disabled'
        )
        return
      }

      this.db = await openDatabase()
      this.initialized = true
    } catch (error) {
      console.error('[QueryStatsStorageService] Failed to initialize:', error)
      // Graceful degradation - don't throw
    }
  }

  async recordExecution(query: string): Promise<void> {
    if (!this.initialized || !this.db) {
      return
    }

    try {
      await upsertEntry(this.db, query)
    } catch (error) {
      console.error(
        '[QueryStatsStorageService] Failed to record execution:',
        error
      )
    }
  }

  async getTopQueries(limit: number): Promise<QueryStat[]> {
    if (!this.initialized || !this.db) {
      return []
    }

    try {
      return await getTopEntries(this.db, limit)
    } catch (error) {
      console.error(
        '[QueryStatsStorageService] Failed to get top queries:',
        error
      )
      return []
    }
  }

  async getRecentQueries(limit: number): Promise<QueryStat[]> {
    if (!this.initialized || !this.db) {
      return []
    }

    try {
      return await getRecentEntries(this.db, limit)
    } catch (error) {
      console.error(
        '[QueryStatsStorageService] Failed to get recent queries:',
        error
      )
      return []
    }
  }

  async clearAll(): Promise<void> {
    if (!this.initialized || !this.db) {
      return
    }

    try {
      await clear(this.db)
    } catch (error) {
      console.error(
        '[QueryStatsStorageService] Failed to clear all stats:',
        error
      )
    }
  }

  close(): void {
    if (this.db) {
      closeDatabase(this.db)
      this.db = null
    }
    this.initialized = false
  }

  static resetInstance(): void {
    if (QueryStatsStorageService.instance) {
      QueryStatsStorageService.instance.close()
      QueryStatsStorageService.instance = null
    }
  }
}
