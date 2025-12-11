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

import { INDEXEDDB_CONFIG, Note } from './types'

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
 * Opens or creates the IndexedDB database with the notes store
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

      // Create the notes object store if it doesn't exist
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: 'id',
          autoIncrement: true
        })

        // Create index on createdAt for ordering
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })

/**
 * Adds a new note to the notes store
 * @param db - The IndexedDB database instance
 * @param note - The note data without id (auto-generated)
 * @returns The complete note with auto-generated id
 */
export const addEntry = (
  db: IDBDatabase,
  note: Omit<Note, 'id'>
): Promise<Note> =>
  new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      const request = store.add(note)

      request.onsuccess = () => {
        const newNote: Note = {
          ...note,
          id: request.result as number
        }
        resolve(newNote)
      }

      request.onerror = () => {
        const errorMsg = request.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to add note: ${errorMsg}`))
      }

      transaction.onerror = () => {
        const errorMsg = transaction.error?.message ?? 'Unknown error'
        reject(new Error(`Transaction failed while adding note: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(`Failed to create transaction for adding note: ${errorMsg}`)
      )
    }
  })

/**
 * Updates an existing note in the store
 * @param db - The IndexedDB database instance
 * @param id - The id of the note to update
 * @param updates - Partial note data to update (excluding id and createdAt)
 */
export const updateEntry = (
  db: IDBDatabase,
  id: number,
  updates: Partial<Omit<Note, 'id' | 'createdAt'>>
): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      // First get the existing note
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const existingNote = getRequest.result as Note | undefined

        if (!existingNote) {
          reject(new Error(`Note with id ${id} not found`))
          return
        }

        // Merge updates with existing note
        const updatedNote: Note = {
          ...existingNote,
          ...updates
        }

        const putRequest = store.put(updatedNote)

        putRequest.onsuccess = () => {
          resolve()
        }

        putRequest.onerror = () => {
          const errorMsg = putRequest.error?.message ?? 'Unknown error'
          reject(new Error(`Failed to update note: ${errorMsg}`))
        }
      }

      getRequest.onerror = () => {
        const errorMsg = getRequest.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to get note for update: ${errorMsg}`))
      }

      transaction.onerror = () => {
        const errorMsg = transaction.error?.message ?? 'Unknown error'
        reject(new Error(`Transaction failed while updating note: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(`Failed to create transaction for updating note: ${errorMsg}`)
      )
    }
  })

/**
 * Deletes a note from the store
 * @param db - The IndexedDB database instance
 * @param id - The id of the note to delete
 */
export const deleteEntry = (db: IDBDatabase, id: number): Promise<void> =>
  new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        const errorMsg = request.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to delete note with id ${id}: ${errorMsg}`))
      }

      transaction.onerror = () => {
        const errorMsg = transaction.error?.message ?? 'Unknown error'
        reject(new Error(`Transaction failed while deleting note: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(`Failed to create transaction for deleting note: ${errorMsg}`)
      )
    }
  })

/**
 * Gets all notes ordered by createdAt DESC (newest first)
 * @param db - The IndexedDB database instance
 * @returns Array of all notes, newest first
 */
export const getAllEntries = (db: IDBDatabase): Promise<Note[]> =>
  new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index('createdAt')
      const entries: Note[] = []

      // Use a cursor in reverse direction (prev) to get newest entries first
      const request = index.openCursor(null, 'prev')

      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          entries.push(cursor.value as Note)
          cursor.continue()
        } else {
          resolve(entries)
        }
      }

      request.onerror = () => {
        const errorMsg = request.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to get all notes: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(
          `Failed to create transaction for getting all notes: ${errorMsg}`
        )
      )
    }
  })

/**
 * Gets the total count of notes in the store
 * @param db - The IndexedDB database instance
 * @returns The number of notes
 */
export const getCount = (db: IDBDatabase): Promise<number> =>
  new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        const errorMsg = request.error?.message ?? 'Unknown error'
        reject(new Error(`Failed to get note count: ${errorMsg}`))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      reject(
        new Error(
          `Failed to create transaction for counting notes: ${errorMsg}`
        )
      )
    }
  })

/**
 * Clears all notes from the store
 * @param db - The IndexedDB database instance
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
        reject(new Error(`Failed to clear notes store: ${errorMsg}`))
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
 * @param db - The IndexedDB database instance
 */
export const closeDatabase = (db: IDBDatabase): void => {
  try {
    db.close()
  } catch {
    // Silently ignore close errors as the connection may already be closed
  }
}
