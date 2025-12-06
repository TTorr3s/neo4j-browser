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
import React from 'react'

import { DownloadIcon } from 'browser-components/icons/LegacyIcons'

import {
  DropdownButton,
  DropdownContent,
  DropdownItem,
  DropdownList
} from '../Stream/styled'

export type ExportItem = {
  name: string
  download: () => void
}
type ExportButtonProps = {
  exportItems?: ExportItem[]
}

function ExportButton({ exportItems = [] }: ExportButtonProps): JSX.Element {
  const canExport: boolean = exportItems.length > 0

  return (
    <>
      {canExport && (
        <DropdownButton title="Exports" data-testid="frame-export-dropdown">
          <DownloadIcon />
          <DropdownList>
            <DropdownContent>
              {exportItems.map(({ name, download }) => (
                <DropdownItem
                  data-testid={`export${name}Button`}
                  onClick={download}
                  key={name}
                >
                  Export {name}
                </DropdownItem>
              ))}
            </DropdownContent>
          </DropdownList>
        </DropdownButton>
      )}
    </>
  )
}

export default ExportButton
