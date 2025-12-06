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
import JSZip from 'jszip'

import { getScriptDisplayName } from 'browser/components/SavedScripts'
import { saveAs } from 'services/exporting/fileSaver'
import { Favorite } from 'shared/modules/favorites/favoritesDuck'
import { Folder } from 'shared/modules/favorites/foldersDuck'

export const CYPHER_FILE_EXTENSION = '.cypher'
export type ExportFormat = 'CYPHERFILE' | 'ZIPFILE'
export const exporters: Record<
  ExportFormat,
  (favorites: Favorite[], folders: Folder[]) => Promise<void>
> = {
  ZIPFILE: exportFavoritesAsZip,
  CYPHERFILE: exportFavoritesAsBigCypherFile
}

export async function exportFavoritesAsBigCypherFile(
  favorites: Favorite[]
): Promise<void> {
  const fileContent = favorites
    .map(favorite => favorite.content)
    .join('\n\n')
    .trim()

  await saveAs(
    new Blob([fileContent], { type: 'application/x-cypher-query' }),
    `saved-scripts-${new Date().toISOString().split('T')[0]}.cypher`
  )
}

type WriteableFavorite = {
  content: string
  fullFilename: string
}
export async function exportFavoritesAsZip(
  favorites: Favorite[],
  folders: Folder[]
): Promise<void> {
  const zip = new JSZip()
  transformFavoriteAndFolders(favorites, folders).forEach(
    ({ content, fullFilename }) => {
      zip.file(fullFilename, content)
    }
  )

  const blob = await zip.generateAsync({ type: 'blob' })
  await saveAs(
    blob,
    `saved-scripts-${new Date().toISOString().split('T')[0]}.zip`
  )
}

function toSafefilename(name: string): string {
  return name
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/_$/, '')
}

function transformFavoriteAndFolders(
  favorites: Favorite[],
  folders: Folder[] = []
): WriteableFavorite[] {
  return favorites.map(fav => {
    const { content, folder: folderId } = fav
    const name = toSafefilename(getScriptDisplayName(fav))
    const nameWithExtension = `${name}${CYPHER_FILE_EXTENSION}`

    const folderName = folders.find(folder => folder.id === folderId)?.name

    return {
      content,
      fullFilename: folderName
        ? [toSafefilename(folderName), nameWithExtension].join('/')
        : nameWithExtension
    }
  })
}
