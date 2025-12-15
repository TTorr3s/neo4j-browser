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
import { useCallback, useMemo, useState } from 'react'
import {
  UseRowSelectInstanceProps,
  UseRowSelectOptions,
  UseRowSelectState,
  useRowSelect
} from 'react-table'

import {
  IRelatableStateInstance,
  SelectSetter,
  TableAddOnReturn
} from '../relatable.types'
import arrayHasItems from '../utils/array-has-items'
import { omit } from 'shared/utils/array-utils'

export interface IWithSelectionOptions<
  Data extends object = any
> extends UseRowSelectOptions<Data> {
  onSelectionChange?: SelectSetter<Data>

  // react-table state override https://react-table.js.org/api/useRowSelect
  selectedRowIds?: { [id: string]: boolean }
}

export type IWithSelectionState<Data extends object = any> =
  UseRowSelectState<Data>

export interface IWithSelectionInstance<Data extends object = any>
  extends
    UseRowSelectInstanceProps<Data>,
    IRelatableStateInstance<Data, IWithSelectionState<Data>> {
  onCustomSelectionChange: SelectSetter<Data>
}

export default function withSelection<Data extends object = any>(
  options: IWithSelectionOptions<Data> = {}
): TableAddOnReturn {
  const {
    selectedRowIds: theirSelectedRowIds,
    onSelectionChange,
    ...tableParams
  } = options
  const [ourSelectedRowIds, setOurSelectedRowIds] = useState<{
    [id: string]: boolean
  }>({})
  const selectedRowIds = theirSelectedRowIds || ourSelectedRowIds
  const stateParams = { selectedRowIds }
  const onCustomSelectionChange: SelectSetter = useCallback(
    (rows, select) => {
      if (onSelectionChange) {
        onSelectionChange(rows, select)

        return
      }

      const newIds = rows.flatMap(({ id, subRows }) =>
        arrayHasItems(subRows) ? subRows.map(subRow => subRow.id) : [id]
      )

      if (select) {
        setOurSelectedRowIds(
          newIds.reduce((agg, id) => Object.assign(agg, { [id]: true }), {
            ...selectedRowIds
          })
        )

        return
      }

      setOurSelectedRowIds(
        omit(selectedRowIds, newIds as (keyof typeof selectedRowIds)[])
      )
    },
    [onSelectionChange, selectedRowIds]
  )

  return [
    withSelection.name,
    null,
    () => true,
    () =>
      useMemo(
        (): Partial<IWithSelectionInstance> => ({
          ...tableParams,
          onCustomSelectionChange
        }),
        [onCustomSelectionChange, ...Object.values(tableParams)]
      ),
    () => useMemo(() => stateParams, [selectedRowIds]),
    useRowSelect
  ]
}
