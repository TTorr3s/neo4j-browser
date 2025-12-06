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
 * Validate that the input is a Blob instance
 *
 * @param blob - The value to validate
 * @throws TypeError if not a Blob
 */
export function validateBlob(blob: unknown): asserts blob is Blob {
  if (!(blob instanceof Blob)) {
    throw new TypeError(
      `Expected Blob, received ${blob === null ? 'null' : typeof blob}`
    )
  }
}

/**
 * Validate that the input is a valid filename
 *
 * @param filename - The value to validate
 * @throws TypeError if not a valid filename
 */
export function validateFilename(
  filename: unknown
): asserts filename is string {
  if (!filename || typeof filename !== 'string') {
    throw new TypeError('Filename must be a non-empty string')
  }
  if (filename.includes('/') || filename.includes('\\')) {
    throw new TypeError('Filename cannot contain path separators')
  }
}

/**
 * Validate that the input is a string
 *
 * @param text - The value to validate
 * @throws TypeError if not a string
 */
export function validateText(text: unknown): asserts text is string {
  if (typeof text !== 'string') {
    throw new TypeError(
      `Expected string, received ${text === null ? 'null' : typeof text}`
    )
  }
}
