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
 * Represents a single query stat entry stored in IndexedDB
 */
export interface QueryStat {
  /** Auto-increment primary key */
  id: number
  /** The normalized query text */
  query: string
  /** Number of times this query has been executed */
  executionCount: number
  /** Unix timestamp of the last execution */
  lastExecutedAt: number
}

/**
 * Redux state shape for query stats module
 */
export interface QueryStatsState {
  /** Top N most executed queries */
  topQueries: QueryStat[]
  /** Most recently executed queries */
  recentQueries: QueryStat[]
  /** Whether the module has been initialized */
  isInitialized: boolean
  /** Last error message, if any */
  error: string | null
}

/**
 * IndexedDB database configuration for query stats
 */
export const INDEXEDDB_CONFIG = {
  databaseName: 'neo4j-browser-query-stats',
  version: 1,
  storeName: 'query_stats'
} as const
