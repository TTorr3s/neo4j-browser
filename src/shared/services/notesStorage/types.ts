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
 * Represents a single note stored in IndexedDB
 */
export interface Note {
  /** Auto-increment primary key */
  id: number
  /** Note title, defaults to "Note #N" */
  title: string
  /** Note content text */
  content: string
  /** Whether the note is collapsed in the UI */
  isCollapsed: boolean
  /** Unix timestamp when the note was created */
  createdAt: number
  /** Formatted timestamp when the note was last updated (yyyy-MM-dd HH:mm:ss America/Mexico_City) */
  updatedAt: string
}

/**
 * Redux state shape for notes module
 */
export interface NotesState {
  /** List of notes */
  items: Note[]
  /** Whether an async operation is in progress */
  isLoading: boolean
  /** Last error message, if any */
  error: string | null
}

/**
 * Configuration constants for notes storage
 */
export const NOTES_CONFIG = {
  /** Maximum number of notes allowed */
  maxNotes: 50,
  /** Maximum content length per note */
  maxContentLength: 1000,
  /** Debounce delay for auto-save operations in milliseconds */
  debounceMs: 500
} as const

/**
 * IndexedDB database configuration for notes
 */
export const INDEXEDDB_CONFIG = {
  databaseName: 'neo4j-browser-notes',
  version: 1,
  storeName: 'notes'
} as const
