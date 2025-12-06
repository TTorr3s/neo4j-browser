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
 * Modern file saving utility with File System Access API support
 * Falls back to createObjectURL for browsers without support
 */

interface FilePickerAcceptType {
  description: string
  accept: Record<string, string[]>
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: FilePickerAcceptType[]
}

interface WritableFileStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}

interface SaveFileHandle {
  createWritable(): Promise<WritableFileStream>
}

declare global {
  interface Window {
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions
    ) => Promise<SaveFileHandle>
  }
}

const EXTENSION_TO_MIME: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  txt: 'text/plain',
  cypher: 'application/x-cypher-query',
  zip: 'application/zip',
  svg: 'image/svg+xml',
  png: 'image/png'
}

const EXTENSION_TO_DESCRIPTION: Record<string, string> = {
  csv: 'CSV files',
  json: 'JSON files',
  txt: 'Text files',
  cypher: 'Cypher files',
  zip: 'ZIP archives',
  svg: 'SVG images',
  png: 'PNG images'
}

function getExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function getMimeType(filename: string): string {
  const ext = getExtension(filename)
  return EXTENSION_TO_MIME[ext] || 'application/octet-stream'
}

function getFilePickerTypes(filename: string): FilePickerAcceptType[] {
  const ext = getExtension(filename)
  const mime = EXTENSION_TO_MIME[ext]
  const description = EXTENSION_TO_DESCRIPTION[ext]

  if (!mime || !description) {
    return []
  }

  return [
    {
      description,
      accept: { [mime]: [`.${ext}`] }
    }
  ]
}

/**
 * Check if File System Access API is available
 */
function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    typeof window.showSaveFilePicker === 'function'
  )
}

/**
 * Save file using File System Access API
 */
async function saveWithFileSystemAccess(
  blob: Blob,
  filename: string
): Promise<boolean> {
  if (!window.showSaveFilePicker) {
    return false
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: getFilePickerTypes(filename)
    })

    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (error) {
    // User cancelled the save dialog - this is expected behavior
    if (error instanceof Error && error.name === 'AbortError') {
      return true // Treat as successful (user intentionally cancelled)
    }
    // For other errors, fall back to legacy method
    return false
  }
}

/**
 * Fallback: Save file using createObjectURL and anchor click
 */
function saveWithObjectURL(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()

  // Cleanup after a short delay to ensure download starts
  setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Save a Blob as a file
 * Uses File System Access API if available, falls back to createObjectURL
 *
 * @param blob - The Blob to save
 * @param filename - Suggested filename for the download
 */
export async function saveAs(blob: Blob, filename: string): Promise<void> {
  if (isFileSystemAccessSupported()) {
    const saved = await saveWithFileSystemAccess(blob, filename)
    if (saved) {
      return
    }
  }

  // Fallback to legacy method
  saveWithObjectURL(blob, filename)
}

/**
 * Synchronous version of saveAs for compatibility
 * Always uses the fallback method (createObjectURL)
 *
 * @param blob - The Blob to save
 * @param filename - Suggested filename for the download
 */
export function saveAsSync(blob: Blob, filename: string): void {
  saveWithObjectURL(blob, filename)
}

/**
 * Create a Blob from data with automatic MIME type detection
 *
 * @param data - The data to convert to a Blob
 * @param filename - Filename used to detect MIME type
 */
export function createBlobForFile(
  data: BlobPart | BlobPart[],
  filename: string
): Blob {
  const mimeType = getMimeType(filename)
  const parts = Array.isArray(data) ? data : [data]
  return new Blob(parts, { type: mimeType })
}
