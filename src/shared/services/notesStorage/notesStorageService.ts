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

import { Note, NOTES_CONFIG } from './types'
import {
  addEntry,
  clear,
  closeDatabase,
  deleteEntry,
  getAllEntries,
  getCount,
  isIndexedDBAvailable,
  openDatabase,
  updateEntry
} from './indexedDBStorage'

/**
 * Formats a date to 'yyyy-MM-dd HH:mm:ss' in America/Mexico_City timezone
 */
const formatTimestamp = (date: Date): string =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
    .format(date)
    .replace(',', '')

/**
 * Singleton service for managing notes storage in IndexedDB.
 *
 * This service provides:
 * - CRUD operations for notes
 * - Automatic timestamp management
 * - Note count tracking
 * - Limit enforcement (maxNotes)
 *
 * @example
 * ```typescript
 * const service = NotesStorageService.getInstance()
 * await service.initialize()
 * const noteId = await service.addNote('My Note', 'Content here')
 * await service.updateNote(noteId, { content: 'Updated content' })
 * await service.deleteNote(noteId)
 * ```
 */
export class NotesStorageService {
  private static instance: NotesStorageService | null = null

  private db: IDBDatabase | null = null
  private initialized: boolean = false
  private noteCount: number = 0

  private constructor() {}

  /**
   * Gets the singleton instance of the NotesStorageService.
   */
  static getInstance(): NotesStorageService {
    if (!NotesStorageService.instance) {
      NotesStorageService.instance = new NotesStorageService()
    }
    return NotesStorageService.instance
  }

  /**
   * Initializes the storage service by opening the IndexedDB database.
   * @throws Error if IndexedDB is not available
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      if (!isIndexedDBAvailable()) {
        throw new Error('IndexedDB is not available in this environment')
      }

      this.db = await openDatabase()
      await this.refreshCount()
      this.initialized = true
    } catch (error) {
      console.error('[NotesStorageService] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * Adds a new note to storage.
   *
   * @param title - The note title
   * @param content - The note content
   * @returns The created note with auto-generated id
   * @throws Error if max notes limit is reached or storage fails
   */
  async addNote(title: string, content: string): Promise<Note> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Check max notes limit
    if (this.noteCount >= NOTES_CONFIG.maxNotes) {
      throw new Error(
        `Maximum number of notes (${NOTES_CONFIG.maxNotes}) reached`
      )
    }

    // Truncate content if it exceeds max length
    const truncatedContent = content.slice(0, NOTES_CONFIG.maxContentLength)

    const now = new Date()
    const noteData: Omit<Note, 'id'> = {
      title,
      content: truncatedContent,
      isCollapsed: false,
      createdAt: now.getTime(),
      updatedAt: formatTimestamp(now)
    }

    try {
      const note = await addEntry(this.db, noteData)
      this.noteCount++
      return note
    } catch (error) {
      console.error('[NotesStorageService] Failed to add note:', error)
      throw error
    }
  }

  /**
   * Updates an existing note.
   *
   * @param id - The id of the note to update
   * @param updates - Partial note data to update (title, content, isCollapsed)
   * @throws Error if note not found or storage fails
   */
  async updateNote(
    id: number,
    updates: Partial<Omit<Note, 'id' | 'createdAt'>>
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    // Truncate content if provided and exceeds max length
    const processedUpdates = { ...updates }
    if (processedUpdates.content !== undefined) {
      processedUpdates.content = processedUpdates.content.slice(
        0,
        NOTES_CONFIG.maxContentLength
      )
    }

    // Always update the updatedAt timestamp
    processedUpdates.updatedAt = formatTimestamp(new Date())

    try {
      await updateEntry(this.db, id, processedUpdates)
    } catch (error) {
      console.error('[NotesStorageService] Failed to update note:', error)
      throw error
    }
  }

  /**
   * Deletes a note from storage.
   *
   * @param id - The id of the note to delete
   * @throws Error if storage fails
   */
  async deleteNote(id: number): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      await deleteEntry(this.db, id)
      this.noteCount = Math.max(0, this.noteCount - 1)
    } catch (error) {
      console.error('[NotesStorageService] Failed to delete note:', error)
      throw error
    }
  }

  /**
   * Gets all notes ordered by createdAt DESC (newest first).
   *
   * @returns Array of all notes
   */
  async getAllNotes(): Promise<Note[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      return await getAllEntries(this.db)
    } catch (error) {
      console.error('[NotesStorageService] Failed to get all notes:', error)
      throw error
    }
  }

  /**
   * Returns the cached note count.
   *
   * @returns The number of notes in storage
   */
  getNoteCount(): number {
    return this.noteCount
  }

  /**
   * Refreshes the note count from storage.
   *
   * @returns The updated note count
   */
  async refreshCount(): Promise<number> {
    if (!this.db) {
      return this.noteCount
    }

    try {
      this.noteCount = await getCount(this.db)
      return this.noteCount
    } catch (error) {
      console.error('[NotesStorageService] Failed to refresh count:', error)
      return this.noteCount
    }
  }

  /**
   * Clears all notes from storage.
   */
  async clearAll(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      await clear(this.db)
      this.noteCount = 0
    } catch (error) {
      console.error('[NotesStorageService] Failed to clear notes:', error)
      throw error
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
    this.noteCount = 0
    this.initialized = false
  }

  /**
   * Resets the singleton instance (primarily for testing).
   */
  static resetInstance(): void {
    if (NotesStorageService.instance) {
      NotesStorageService.instance.close()
      NotesStorageService.instance = null
    }
  }
}
