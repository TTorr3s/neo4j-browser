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

import { getMimeType } from './mimeRegistry'
import { saveAs } from './saveAs'
import { SaveOptions, SaveResult } from './types'
import { validateFilename, validateText } from './validation'

/**
 * Save text content as a file
 *
 * @param text - Text content to save
 * @param filename - Filename (extension determines MIME type)
 * @param options - Optional save configuration
 *
 * @example
 * await saveText('Hello, World!', 'greeting.txt')
 * await saveText('MATCH (n) RETURN n', 'query.cypher')
 */
export async function saveText(
  text: string,
  filename: string,
  options?: SaveOptions
): Promise<SaveResult> {
  validateText(text)

  const mimeType = getMimeType(filename)
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  return saveAs(blob, filename, options)
}

/**
 * Save data as a JSON file
 *
 * @param data - Data to serialize as JSON
 * @param filename - Filename (should end with .json)
 * @param options - Optional save configuration
 * @param indent - JSON indentation (default: 2 spaces)
 *
 * @example
 * await saveJSON({ name: 'John', age: 30 }, 'user.json')
 * await saveJSON(arrayData, 'export.json', undefined, 0) // minified
 */
export async function saveJSON(
  data: unknown,
  filename: string,
  options?: SaveOptions,
  indent: number = 2
): Promise<SaveResult> {
  let jsonString: string
  try {
    jsonString = JSON.stringify(data, null, indent)
  } catch (error) {
    return {
      status: 'error',
      error:
        error instanceof Error ? error : new Error('Failed to serialize JSON')
    }
  }

  const blob = new Blob([jsonString], {
    type: 'application/json;charset=utf-8'
  })
  return saveAs(blob, filename, options)
}

/**
 * Create a Blob from data with automatic MIME type detection
 *
 * @param data - The data to convert to a Blob
 * @param filename - Filename used to detect MIME type
 *
 * @example
 * const blob = createBlobForFile('content', 'file.txt')
 * const blob = createBlobForFile([part1, part2], 'data.csv')
 */
export function createBlobForFile(
  data: BlobPart | BlobPart[],
  filename: string
): Blob {
  validateFilename(filename)
  const mimeType = getMimeType(filename)
  const parts = Array.isArray(data) ? data : [data]
  return new Blob(parts, { type: mimeType })
}
