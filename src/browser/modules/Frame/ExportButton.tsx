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
import { type JSX, useState } from 'react'

import {
  DropDownItemDivider,
  DropdownButton,
  DropdownContent,
  DropdownItem,
  DropdownList
} from '../Stream/styled'
import { DownloadIcon } from 'browser-components/icons/LegacyIcons'

export type ExportItem = {
  name: string
  download: () => void
}

export type CopyItem = {
  name: string
  copy: () => Promise<void>
}

type ExportButtonProps = {
  exportItems?: ExportItem[]
  copyItems?: CopyItem[]
}

function ExportButton({
  exportItems = [],
  copyItems = []
}: ExportButtonProps): JSX.Element {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const canExport: boolean = exportItems.length > 0 || copyItems.length > 0

  const handleCopy = async (item: CopyItem) => {
    try {
      await item.copy()
      setCopiedItem(item.name)
      setTimeout(() => setCopiedItem(null), 1500)
    } catch {
      // Copy failed silently
    }
  }

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
                  key={`export-${name}`}
                >
                  Export {name}
                </DropdownItem>
              ))}
              {exportItems.length > 0 && copyItems.length > 0 && (
                <DropDownItemDivider />
              )}
              {copyItems.map(item => (
                <DropdownItem
                  data-testid={`copy${item.name}Button`}
                  onClick={() => handleCopy(item)}
                  key={`copy-${item.name}`}
                >
                  Copy {item.name} {copiedItem === item.name && '\u2713'}
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
