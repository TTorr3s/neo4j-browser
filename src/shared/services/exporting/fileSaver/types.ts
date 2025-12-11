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
 * File picker accept type for showSaveFilePicker
 */
export interface FilePickerAcceptType {
  description: string
  accept: Record<string, string[]>
}

/**
 * Options for showSaveFilePicker API
 */
export interface SaveFilePickerOptions {
  suggestedName?: string
  types?: FilePickerAcceptType[]
  startIn?: WellKnownDirectory
}

/**
 * Writable stream returned by FileSystemFileHandle.createWritable()
 */
export interface WritableFileStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}

/**
 * File handle returned by showSaveFilePicker
 */
export interface SaveFileHandle {
  createWritable(): Promise<WritableFileStream>
}

/**
 * Well-known directories for file picker starting location
 */
export type WellKnownDirectory =
  | 'desktop'
  | 'documents'
  | 'downloads'
  | 'music'
  | 'pictures'
  | 'videos'

/**
 * Method used to save the file
 */
export type SaveMethod = 'file-system-access' | 'object-url'

/**
 * Result of a save operation
 */
export type SaveResult =
  | { status: 'saved'; method: SaveMethod }
  | { status: 'cancelled' }
  | { status: 'error'; error: Error }

/**
 * Options for saveAs function
 */
export interface SaveOptions {
  /** Force a specific save method */
  forceMethod?: SaveMethod
  /** Additional MIME types for the file picker */
  additionalTypes?: FilePickerAcceptType[]
  /** Starting directory for file picker (if browser supports it) */
  startIn?: WellKnownDirectory
}

/**
 * Information about a registered file type
 */
export interface FileTypeInfo {
  mime: string
  description: string
}

// Extend Window interface for File System Access API
declare global {
  interface Window {
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions
    ) => Promise<SaveFileHandle>
  }
}
