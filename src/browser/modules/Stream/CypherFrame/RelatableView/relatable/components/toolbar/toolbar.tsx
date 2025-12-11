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
import React from 'react'

import {
  withFilters,
  withGrouping,
  withSelection,
  withSorting
} from '../../add-ons'
import { useRelatableStateContext } from '../../states'
import { isActionAvailable } from '../../utils/relatable-actions'
import { Menu } from '../styled'
import FilterableToolbar from './filterable.toolbar'
import GroupableToolbar from './groupable.toolbar'
import SelectableToolbar from './selectable.toolbar'
import SortableToolbar from './sortable.toolbar'

export interface ToolbarProps {
  className?: string
  children?: React.ReactNode
}

export default function Toolbar(props: ToolbarProps = {}): JSX.Element {
  const { className = '', children } = props
  const { availableGlobalActions } = useRelatableStateContext()

  if (children) {
    return <Menu className={`relatable__toolbar ${className}`}>{children}</Menu>
  }

  return (
    <Menu className={`relatable__toolbar ${className}`}>
      {isActionAvailable(availableGlobalActions, withGrouping.name) && (
        <GroupableToolbar />
      )}
      {isActionAvailable(availableGlobalActions, withFilters.name) && (
        <FilterableToolbar />
      )}
      {isActionAvailable(availableGlobalActions, withSorting.name) && (
        <SortableToolbar />
      )}
      {isActionAvailable(availableGlobalActions, withSelection.name) && (
        <SelectableToolbar />
      )}
    </Menu>
  )
}
