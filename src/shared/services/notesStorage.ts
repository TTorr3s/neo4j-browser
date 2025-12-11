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

// Note interface
export interface Note {
  id: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
  isCollapsed: boolean
}

// Notes state interface
export interface NotesState {
  items: Note[]
  isLoading: boolean
  error: string | null
}

// Configuration constants
export const NOTES_CONFIG = {
  maxNotes: 50,
  maxContentLength: 1000,
  debounceMs: 500,
  storageKey: 'neo4j.notes'
} as const

// Helper to format date for display
export const formatNoteDate = (date: Date = new Date()): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Create a new note with defaults
export const createNote = (
  title: string,
  content: string,
  existingNotes: Note[]
): Note => {
  const now = new Date()
  const maxId = existingNotes.reduce((max, note) => Math.max(max, note.id), 0)

  return {
    id: maxId + 1,
    title: title || `Note #${maxId + 1}`,
    content: content.slice(0, NOTES_CONFIG.maxContentLength),
    createdAt: formatNoteDate(now),
    updatedAt: formatNoteDate(now),
    isCollapsed: false
  }
}

/**
 * NotesStorageService - Singleton service for managing notes persistence.
 *
 * Uses localStorage for simple persistence with async API for future
 * IndexedDB migration compatibility.
 */
export class NotesStorageService {
  private static instance: NotesStorageService | null = null
  private notes: Note[] = []
  private initialized = false

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): NotesStorageService {
    if (!NotesStorageService.instance) {
      NotesStorageService.instance = new NotesStorageService()
    }
    return NotesStorageService.instance
  }

  /**
   * Initialize the storage service by loading notes from localStorage.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      const stored = localStorage.getItem(NOTES_CONFIG.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.notes = Array.isArray(parsed) ? parsed : []
      }
      this.initialized = true
    } catch (error) {
      console.error('[NotesStorageService] Failed to initialize:', error)
      this.notes = []
      this.initialized = true
      throw error
    }
  }

  /**
   * Get all notes sorted by updatedAt descending (most recent first).
   */
  async getAllNotes(): Promise<Note[]> {
    return [...this.notes].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  /**
   * Add a new note.
   */
  async addNote(title: string, content: string): Promise<Note> {
    const newNote = createNote(title, content, this.notes)
    this.notes.push(newNote)
    this.persist()
    return newNote
  }

  /**
   * Update an existing note.
   */
  async updateNote(
    id: number,
    updates: Partial<Omit<Note, 'id' | 'createdAt'>>
  ): Promise<Note | null> {
    const index = this.notes.findIndex(note => note.id === id)
    if (index === -1) {
      return null
    }

    const updatedNote: Note = {
      ...this.notes[index],
      ...updates,
      updatedAt: formatNoteDate()
    }
    this.notes[index] = updatedNote
    this.persist()
    return updatedNote
  }

  /**
   * Delete a note by ID.
   */
  async deleteNote(id: number): Promise<boolean> {
    const index = this.notes.findIndex(note => note.id === id)
    if (index === -1) {
      return false
    }

    this.notes.splice(index, 1)
    this.persist()
    return true
  }

  /**
   * Get a single note by ID.
   */
  async getNoteById(id: number): Promise<Note | null> {
    return this.notes.find(note => note.id === id) || null
  }

  /**
   * Clear all notes.
   */
  async clearAll(): Promise<void> {
    this.notes = []
    this.persist()
  }

  /**
   * Persist notes to localStorage.
   */
  private persist(): void {
    try {
      localStorage.setItem(NOTES_CONFIG.storageKey, JSON.stringify(this.notes))
    } catch (error) {
      console.error('[NotesStorageService] Failed to persist notes:', error)
    }
  }
}

// Legacy storage operations (kept for backward compatibility)
export const notesStorage = {
  load(): Note[] {
    try {
      const stored = localStorage.getItem(NOTES_CONFIG.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch (error) {
      console.error('Failed to load notes from storage:', error)
    }
    return []
  },

  save(notes: Note[]): void {
    try {
      localStorage.setItem(NOTES_CONFIG.storageKey, JSON.stringify(notes))
    } catch (error) {
      console.error('Failed to save notes to storage:', error)
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(NOTES_CONFIG.storageKey)
    } catch (error) {
      console.error('Failed to clear notes from storage:', error)
    }
  }
}
