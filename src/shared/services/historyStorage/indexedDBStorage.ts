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

import { HistoryEntry, INDEXEDDB_CONFIG } from './types'

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
 * Opens or creates the IndexedDB database with the queries store
 */
export const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }

    const request = indexedDB.open(databaseName, version)

    request.onerror = () => {
      reject(
        new Error(
          `Failed to open IndexedDB database: ${request.error?.message ?? 'Unknown error'}`
        )
      )
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create the queries object store if it doesn't exist
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: 'id',
          autoIncrement: true
        })

        // Create index on timestamp for ordering
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

/**
 * Adds a new entry to the history store
 * @returns The auto-generated id of the new entry
 */
export const addEntry = (db: IDBDatabase, query: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      const entry: Omit<HistoryEntry, 'id'> = {
        query,
        timestamp: Date.now()
      }

      const request = store.add(entry)

      request.onsuccess = () => {
        resolve(request.result as number)
      }

      request.onerror = () => {
        reject(
          new Error(
            `Failed to add history entry: ${request.error?.message ?? 'Unknown error'}`
          )
        )
      }

      transaction.onerror = () => {
        reject(
          new Error(
            `Transaction failed while adding entry: ${transaction.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for adding entry: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Gets a single entry by its id
 * @returns The entry or null if not found
 */
export const getEntry = (
  db: IDBDatabase,
  id: number
): Promise<HistoryEntry | null> => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve((request.result as HistoryEntry) ?? null)
      }

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get entry with id ${id}: ${request.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for getting entry: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Gets a range of entries by their ids (inclusive)
 * @returns Array of entries within the range, ordered by id ascending
 */
export const getRange = (
  db: IDBDatabase,
  startId: number,
  endId: number
): Promise<HistoryEntry[]> => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const range = IDBKeyRange.bound(startId, endId)
      const request = store.getAll(range)

      request.onsuccess = () => {
        resolve(request.result as HistoryEntry[])
      }

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get entries in range [${startId}, ${endId}]: ${request.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for getting range: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Gets the most recent N entries, ordered by id descending (newest first)
 */
export const getLatestEntries = (
  db: IDBDatabase,
  count: number
): Promise<HistoryEntry[]> => {
  return new Promise((resolve, reject) => {
    if (count <= 0) {
      resolve([])
      return
    }

    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const entries: HistoryEntry[] = []

      // Use a cursor in reverse direction (prev) to get newest entries first
      const request = store.openCursor(null, 'prev')

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && entries.length < count) {
          entries.push(cursor.value as HistoryEntry)
          cursor.continue()
        } else {
          resolve(entries)
        }
      }

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get latest ${count} entries: ${request.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for getting latest entries: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Gets all entries ordered by id descending (newest first)
 */
export const getAllEntries = (db: IDBDatabase): Promise<HistoryEntry[]> => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result as HistoryEntry[]
        // Sort by id descending (newest first)
        entries.sort((a, b) => b.id - a.id)
        resolve(entries)
      }

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get all entries: ${request.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for getting all entries: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Gets the total count of entries in the store
 */
export const getCount = (db: IDBDatabase): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(
          new Error(
            `Failed to get entry count: ${request.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for counting entries: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Deletes the oldest N entries from the store
 * Entries are considered oldest based on their id (lowest ids first)
 */
export const deleteOldestEntries = (
  db: IDBDatabase,
  countToDelete: number
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (countToDelete <= 0) {
      resolve()
      return
    }

    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      let deletedCount = 0

      // Use a cursor in forward direction (next) to get oldest entries first
      const request = store.openCursor(null, 'next')

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor && deletedCount < countToDelete) {
          cursor.delete()
          deletedCount++
          cursor.continue()
        }
      }

      transaction.oncomplete = () => {
        resolve()
      }

      transaction.onerror = () => {
        reject(
          new Error(
            `Failed to delete oldest ${countToDelete} entries: ${transaction.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for deleting entries: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Clears all entries from the store
 */
export const clear = (db: IDBDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(
          new Error(
            `Failed to clear history store: ${request.error?.message ?? 'Unknown error'}`
          )
        )
      }
    } catch (error) {
      reject(
        new Error(
          `Failed to create transaction for clearing store: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

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
