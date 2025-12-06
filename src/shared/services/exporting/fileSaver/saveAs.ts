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

import {
  isFileSystemAccessSupported,
  saveWithFileSystemAccess,
  saveWithObjectURL
} from './saveStrategies'
import { SaveOptions, SaveResult } from './types'
import { validateBlob, validateFilename } from './validation'

/**
 * Save a Blob as a file
 * Uses File System Access API if available, falls back to createObjectURL
 *
 * @param blob - The Blob to save
 * @param filename - Suggested filename for the download
 * @param options - Optional configuration
 * @returns Result indicating success, cancellation, or error
 *
 * @example
 * const result = await saveAs(blob, 'data.json')
 * if (result.status === 'saved') {
 *   console.log(`Saved using ${result.method}`)
 * } else if (result.status === 'cancelled') {
 *   console.log('User cancelled')
 * } else {
 *   console.error('Error:', result.error)
 * }
 */
export async function saveAs(
  blob: Blob,
  filename: string,
  options?: SaveOptions
): Promise<SaveResult> {
  validateBlob(blob)
  validateFilename(filename)

  // Force specific method if requested
  if (options?.forceMethod === 'object-url') {
    return saveWithObjectURL(blob, filename)
  }

  if (options?.forceMethod === 'file-system-access') {
    if (!isFileSystemAccessSupported()) {
      return {
        status: 'error',
        error: new Error(
          'File System Access API is not supported in this browser'
        )
      }
    }
    return saveWithFileSystemAccess(blob, filename, options)
  }

  // Auto-detect: try File System Access first, fall back to Object URL
  if (isFileSystemAccessSupported()) {
    const result = await saveWithFileSystemAccess(blob, filename, options)
    // Only fall back on actual errors, not cancellation
    if (result.status !== 'error') {
      return result
    }
  }

  return saveWithObjectURL(blob, filename)
}

/**
 * Synchronous version of saveAs for compatibility
 * Always uses the fallback method (createObjectURL)
 *
 * @param blob - The Blob to save
 * @param filename - Suggested filename for the download
 * @returns Result indicating success or error
 */
export function saveAsSync(blob: Blob, filename: string): SaveResult {
  validateBlob(blob)
  validateFilename(filename)
  return saveWithObjectURL(blob, filename)
}
