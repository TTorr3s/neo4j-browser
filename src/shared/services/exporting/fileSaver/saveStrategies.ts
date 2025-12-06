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

import { getFilePickerTypes } from './mimeRegistry'
import { SaveOptions, SaveResult } from './types'

// ============================================================================
// Support Detection (Cached)
// ============================================================================

let _isFileSystemAccessSupported: boolean | null = null

/**
 * Check if File System Access API is available
 * Result is cached after first call
 */
export function isFileSystemAccessSupported(): boolean {
  if (_isFileSystemAccessSupported === null) {
    _isFileSystemAccessSupported =
      typeof window !== 'undefined' &&
      'showSaveFilePicker' in window &&
      typeof window.showSaveFilePicker === 'function'
  }
  return _isFileSystemAccessSupported
}

/**
 * Reset the cached support detection (useful for testing)
 */
export function resetSupportDetection(): void {
  _isFileSystemAccessSupported = null
}

// ============================================================================
// Save Strategies
// ============================================================================

/**
 * Save file using File System Access API
 * Provides native file picker dialog for better UX
 */
export async function saveWithFileSystemAccess(
  blob: Blob,
  filename: string,
  options?: SaveOptions
): Promise<SaveResult> {
  if (!window.showSaveFilePicker) {
    return {
      status: 'error',
      error: new Error('File System Access API not available')
    }
  }

  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: getFilePickerTypes(filename, options?.additionalTypes),
      startIn: options?.startIn
    })

    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()

    return { status: 'saved', method: 'file-system-access' }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'cancelled' }
    }
    return {
      status: 'error',
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}

/**
 * Save file using createObjectURL and anchor click
 * Universal fallback that works in all browsers
 */
export function saveWithObjectURL(blob: Blob, filename: string): SaveResult {
  try {
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

    return { status: 'saved', method: 'object-url' }
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error : new Error(String(error))
    }
  }
}
