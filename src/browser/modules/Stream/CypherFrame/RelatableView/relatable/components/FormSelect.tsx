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
import React, { ChangeEvent } from 'react'

import { SelectLabel, SelectWrapper, StyledSelect } from './styled'

export interface SelectOption {
  key: string | number
  value: string | number
  text: string | number
}

export interface FormSelectProps {
  options: SelectOption[]
  value?: string | number
  onChange?: (
    event: ChangeEvent<HTMLSelectElement>,
    data: { value: string | number }
  ) => void
  label?: string
  inline?: boolean
  search?: boolean
  searchInput?: { autoFocus?: boolean }
  className?: string
  disabled?: boolean
}

/**
 * A styled select component to replace semantic-ui-react FormSelect.
 * Maintains API compatibility with the original component.
 */
export default function FormSelect({
  options,
  value,
  onChange,
  label,
  inline = false,
  className,
  disabled,
  searchInput
}: FormSelectProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    if (onChange) {
      onChange(e, { value: e.target.value })
    }
  }

  return (
    <SelectWrapper $inline={inline} className={className}>
      {label && <SelectLabel>{label}</SelectLabel>}
      <StyledSelect
        value={value}
        onChange={handleChange}
        disabled={disabled}
        autoFocus={searchInput?.autoFocus}
      >
        {options.map(option => (
          <option key={option.key} value={option.value}>
            {option.text}
          </option>
        ))}
      </StyledSelect>
    </SelectWrapper>
  )
}
