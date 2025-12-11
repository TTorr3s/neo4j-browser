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
import { every } from 'lodash-es'
import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { ChangeEvent } from 'react'

import { StyledCheckbox } from '../styled'

export default function RowActions({
  rows,
  onExpandClick,
  onSelectClick
}: any) {
  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSelectClick(event.target.checked)
  }

  return (
    <span className="relatable__table-row-actions">
      {onExpandClick && (
        <span className="relatable__row-expander" onClick={onExpandClick}>
          {every(rows, 'isExpanded') ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </span>
      )}
      {onSelectClick && (
        <StyledCheckbox
          type="checkbox"
          className="relatable__row-selector"
          checked={every(rows, 'isSelected')}
          onChange={handleCheckboxChange}
        />
      )}
    </span>
  )
}
