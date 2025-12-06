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

import { FilePickerAcceptType, FileTypeInfo } from './types'

/**
 * Registry of file extensions to MIME types and descriptions
 */
const mimeRegistry = new Map<string, FileTypeInfo>([
  ['csv', { mime: 'text/csv', description: 'CSV files' }],
  ['json', { mime: 'application/json', description: 'JSON files' }],
  ['txt', { mime: 'text/plain', description: 'Text files' }],
  [
    'cypher',
    { mime: 'application/x-cypher-query', description: 'Cypher files' }
  ],
  ['zip', { mime: 'application/zip', description: 'ZIP archives' }],
  ['svg', { mime: 'image/svg+xml', description: 'SVG images' }],
  ['png', { mime: 'image/png', description: 'PNG images' }],
  ['grass', { mime: 'text/plain', description: 'GraSS style files' }]
])

/**
 * Normalize extension by removing leading dot and converting to lowercase
 */
function normalizeExtension(extension: string): string {
  return extension.toLowerCase().replace(/^\./, '')
}

/**
 * Register a new file type for MIME detection and file picker
 *
 * @param extension - File extension without dot (e.g., 'pdf')
 * @param mime - MIME type (e.g., 'application/pdf')
 * @param description - Human-readable description (e.g., 'PDF documents')
 *
 * @example
 * registerFileType('graphml', 'application/graphml+xml', 'GraphML files')
 */
export function registerFileType(
  extension: string,
  mime: string,
  description: string
): void {
  if (!extension || typeof extension !== 'string') {
    throw new TypeError('Extension must be a non-empty string')
  }
  if (!mime || typeof mime !== 'string') {
    throw new TypeError('MIME type must be a non-empty string')
  }
  if (!description || typeof description !== 'string') {
    throw new TypeError('Description must be a non-empty string')
  }

  mimeRegistry.set(normalizeExtension(extension), { mime, description })
}

/**
 * Unregister a file type
 *
 * @param extension - File extension to remove
 * @returns true if the type was removed, false if it didn't exist
 */
export function unregisterFileType(extension: string): boolean {
  return mimeRegistry.delete(normalizeExtension(extension))
}

/**
 * Get all registered file types
 */
export function getRegisteredFileTypes(): ReadonlyMap<string, FileTypeInfo> {
  return mimeRegistry
}

/**
 * Extract file extension from filename
 *
 * @param filename - The filename to extract extension from
 * @returns The lowercase extension without dot, or empty string if none
 *
 * @example
 * getExtension('data.json') // 'json'
 * getExtension('file')      // ''
 */
export function getExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Get MIME type for a filename based on its extension
 *
 * @param filename - The filename to get MIME type for
 * @returns The MIME type, or 'application/octet-stream' if unknown
 *
 * @example
 * getMimeType('data.json') // 'application/json'
 * getMimeType('unknown.xyz') // 'application/octet-stream'
 */
export function getMimeType(filename: string): string {
  const ext = getExtension(filename)
  return mimeRegistry.get(ext)?.mime ?? 'application/octet-stream'
}

/**
 * Get file picker accept types for a filename
 *
 * @param filename - The filename to get types for
 * @param additionalTypes - Additional types to include
 * @returns Array of FilePickerAcceptType for showSaveFilePicker
 */
export function getFilePickerTypes(
  filename: string,
  additionalTypes?: FilePickerAcceptType[]
): FilePickerAcceptType[] {
  const ext = getExtension(filename)
  const typeInfo = mimeRegistry.get(ext)

  const types: FilePickerAcceptType[] = []

  if (typeInfo) {
    types.push({
      description: typeInfo.description,
      accept: { [typeInfo.mime]: [`.${ext}`] }
    })
  }

  if (additionalTypes) {
    types.push(...additionalTypes)
  }

  return types
}
