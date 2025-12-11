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
 *
 * @module fileSaver
 *
 * @example
 * // Basic usage
 * import { saveAs } from 'services/exporting/fileSaver'
 * await saveAs(blob, 'data.json')
 *
 * @example
 * // With options
 * import { saveAs } from 'services/exporting/fileSaver'
 * const result = await saveAs(blob, 'data.json', {
 *   forceMethod: 'file-system-access',
 *   startIn: 'downloads'
 * })
 *
 * @example
 * // Convenience helpers
 * import { saveText, saveJSON } from 'services/exporting/fileSaver'
 * await saveText('Hello!', 'greeting.txt')
 * await saveJSON({ key: 'value' }, 'data.json')
 *
 * @example
 * // Register custom file types
 * import { registerFileType } from 'services/exporting/fileSaver'
 * registerFileType('graphml', 'application/graphml+xml', 'GraphML files')
 */

// Main API
export { saveAs, saveAsSync } from './saveAs'

// Convenience helpers
export { createBlobForFile, saveJSON, saveText } from './helpers'

// MIME registry
export {
  getExtension,
  getMimeType,
  getRegisteredFileTypes,
  registerFileType,
  unregisterFileType
} from './mimeRegistry'

// Support detection
export {
  isFileSystemAccessSupported,
  resetSupportDetection
} from './saveStrategies'

// Types
export type {
  FilePickerAcceptType,
  FileTypeInfo,
  SaveMethod,
  SaveOptions,
  SaveResult,
  WellKnownDirectory
} from './types'
