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
 * Returns a new array with duplicates removed based on a key.
 * If key is a function, it's called with each item to determine the key.
 * If key is a property name, that property's value is used as the key.
 * When duplicates are found, the last occurrence is kept.
 */
export function uniqBy<T>(
  array: T[],
  key: keyof T | ((item: T) => unknown)
): T[] {
  const getKey = typeof key === 'function' ? key : (item: T) => item[key]
  return Array.from(new Map(array.map(item => [getKey(item), item])).values())
}

/**
 * Creates an object composed of the picked properties from the source object.
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      if (key in obj) {
        acc[key] = obj[key]
      }
      return acc
    },
    {} as Pick<T, K>
  )
}

/**
 * Creates an object composed of all properties from the source object
 * except the omitted properties.
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[]
): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result as Omit<T, K>
}
