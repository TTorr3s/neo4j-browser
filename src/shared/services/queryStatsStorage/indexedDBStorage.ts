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
import { INDEXEDDB_CONFIG, QueryStat } from './types'

const { databaseName, version, storeName } = INDEXEDDB_CONFIG

/**
 * Check if IndexedDB is available in the current browser environment
 */
export const isIndexedDBAvailable = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.indexedDB !== 'undefined' &&
      window.indexedDB !== null
    )
  } catch {
    return false
  }
}

/**
 * Opens or creates the IndexedDB database with the query_stats store
 */
export const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }

    const request = indexedDB.open(databaseName, version)

    request.onerror = () => {
      const errorMsg = request.error?.message ?? 'Unknown error'
      reject(new Error(`Failed to open IndexedDB database: ${errorMsg}`))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: 'id',
          autoIncrement: true
        })

        // Unique index on query text for fast lookups
        store.createIndex('query', 'query', { unique: true })
        // Index on executionCount for top queries sorting
        store.createIndex('executionCount', 'executionCount', { unique: false })
        // Index on lastExecutedAt for recent queries sorting
        store.createIndex('lastExecutedAt', 'lastExecutedAt', { unique: false })
      }
    }
  })

/**
 * Upserts a query stat entry: increments executionCount if exists, creates new if not.
 * Uses a single read-write transaction for atomicity.
 */
export const upsertEntry = (
  db: IDBDatabase,
  query: string
): Promise<QueryStat> =>
  new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const index = store.index('query')
      const getRequest = index.get(query)

      getRequest.onsuccess = () => {
        const existing = getRequest.result as QueryStat | undefined
        const now = Date.now()

        if (existing) {
          const updated: QueryStat = {
            ...existing,
            executionCount: existing.executionCount + 1,
            lastExecutedAt: now
          }
          const putRequest = store.put(updated)
          putRequest.onsuccess = () => resolve(updated)
          putRequest.onerror = () => {
            const errorMsg = putRequest.error?.message ?? 'Unknown error'
            reject(new Error(`Failed to update query stat: ${errorMsg}`))
          }
        } else {
          const newEntry: Omit<QueryStat, 'id'> = {
            query,
            executionCount: 1,
            lastExecutedAt: now
          }
          const addRequest = store.add(newEntry)
          addRequest.onsuccess = () => {
            resolve({ ...newEntry, id: addRequest.result as number })
          }
          addRequest.onerror = () => {
            const errorMsg = addRequest.error?.message ?? 'Unknown error'
            reject(new Error(`Failed to add query stat: ${errorMsg}`))
          }
        }
      }

      getRequest.onerror = () => {
        const errorMsg = getRequest.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to look up query stat: ${errorMsg}`))
      }

      transaction.onerror = () => {
        const errorMsg = transaction.error?.message ?? 'Unknown error'
        reject(
          new Error(
            `Transaction failed while upserting query stat: ${errorMsg}`
          )
        )
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(
          `Failed to create transaction for upserting query stat: ${errorMsg}`
        )
      )
    }
  })

/**
 * Gets the top N entries by executionCount (highest first)
 */
export const getTopEntries = (
  db: IDBDatabase,
  limit: number
): Promise<QueryStat[]> =>
  new Promise((resolve, reject) => {
    if (limit <= 0) {
      resolve([])
      return
    }

    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('executionCount')
      const entries: QueryStat[] = []

      // Cursor in reverse (prev) to get highest executionCount first
      const request = index.openCursor(null, 'prev')

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && entries.length < limit) {
          entries.push(cursor.value as QueryStat)
          cursor.continue()
        } else {
          resolve(entries)
        }
      }

      request.onerror = () => {
        const errorMsg = request.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to get top entries: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(
          `Failed to create transaction for getting top entries: ${errorMsg}`
        )
      )
    }
  })

/**
 * Gets the most recent N entries by lastExecutedAt (newest first)
 */
export const getRecentEntries = (
  db: IDBDatabase,
  limit: number
): Promise<QueryStat[]> =>
  new Promise((resolve, reject) => {
    if (limit <= 0) {
      resolve([])
      return
    }

    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('lastExecutedAt')
      const entries: QueryStat[] = []

      // Cursor in reverse (prev) to get most recent first
      const request = index.openCursor(null, 'prev')

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && entries.length < limit) {
          entries.push(cursor.value as QueryStat)
          cursor.continue()
        } else {
          resolve(entries)
        }
      }

      request.onerror = () => {
        const errorMsg = request.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to get recent entries: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(
          `Failed to create transaction for getting recent entries: ${errorMsg}`
        )
      )
    }
  })

/**
 * Clears all entries from the store
 */
export const clear = (db: IDBDatabase): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        const errorMsg = request.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to clear query stats store: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(
          `Failed to create transaction for clearing store: ${errorMsg}`
        )
      )
    }
  })

/**
 * Closes the database connection
 */
export const closeDatabase = (db: IDBDatabase): void => {
  try {
    db.close()
  } catch {
    // Silently ignore close errors as the connection may already be closed
  }
}
