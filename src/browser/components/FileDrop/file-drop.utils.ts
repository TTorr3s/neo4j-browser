/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 * This file is part of Neo4j.
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
import JSZip from 'jszip'
import { v4 as uuidv4 } from 'uuid'

import { CYPHER_FILE_EXTENSION } from 'services/exporting/favoriteUtils'

const keyBy = <T extends Record<string, any>>(
  arr: T[],
  key: keyof T
): Record<string, T> =>
  Object.fromEntries(arr.map(item => [String(item[key]), item]))

/**
 * Extracts folders from favorites
 * @param     {Object[]}    favorites
 * @return    {string[]}
 */
export function getFolderNamesFromFavorites(favorites: any) {
  return favorites.map((f: any) => f.folderName).filter(Boolean)
}

/**
 * Returns new folder objects for those who do not have a matching name
 * @param     {string[]}    folderNames
 * @param     {Object[]}    allFolders
 * @return    {Object[]}
 */
export function getMissingFoldersFromNames(folderNames: any, allFolders: any) {
  const existingNames = allFolders.map((f: any) => f.name)

  return folderNames
    .filter((folderName: string) => !existingNames.includes(folderName))
    .map((name: string) => ({
      name,
      id: uuidv4()
    }))
}

/**
 * Creates a LOAD_FAVORITES payload complete with folder IDs when applicable
 * @param     {Object[]}    favoritesToAdd
 * @param     {Object[]}    allFolders
 * @return    {Object[]}
 */
export function createLoadFavoritesPayload(
  favoritesToAdd: any,
  allFolders: any
) {
  const allFavoriteFolders: Record<string, any> = keyBy(allFolders, 'name')

  return favoritesToAdd.map(({ id, contents, folderName }: any) => ({
    id,
    content: contents,
    ...(folderName in allFavoriteFolders
      ? { folder: allFavoriteFolders[folderName].id }
      : {})
  }))
}

/**
 * Extracts all .cypher files from a .zip archive and converts them to user scripts
 * @param     {File[]}                uploads uploaded .zip files
 * @return    {Promise<Object[]>}
 */
export async function readZipFiles(uploads: any) {
  const archives: any[] = await Promise.all(
    uploads.map((u: any) => JSZip.loadAsync(u))
  )
  const allFiles: any[] = archives.flatMap(({ files }) => Object.values(files))
  const onlyCypherFiles = allFiles.filter(
    ({ name }: any) =>
      !name.startsWith('__MACOSX') && name.endsWith(CYPHER_FILE_EXTENSION)
  )

  return Promise.all(
    onlyCypherFiles.map((file: any) =>
      file.async('string').then(fileContentToFavoriteFactory(file))
    )
  )
}

/**
 * Factory function returning a file to user script object mapper
 * @param     {File}        file
 * @return    {Function}            user scripts mapper
 */
export function fileContentToFavoriteFactory(file: any) {
  /**
   * Maps .zip archive file contents to a user script object
   * @param     {String}      contents    file contents
   * @return    {Object}                  user scripts object
   */
  return (contents: any) => {
    const pathWithoutLeadingSlash = file.name.startsWith('/')
      ? file.name.slice(1)
      : file.name
    const pathParts = pathWithoutLeadingSlash.split('/')
    const folderName = [...pathParts].reverse().slice(1).reverse().join('/')

    return { id: uuidv4(), contents, folderName }
  }
}
