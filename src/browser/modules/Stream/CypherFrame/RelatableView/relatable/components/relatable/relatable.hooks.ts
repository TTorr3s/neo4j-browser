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
import { Dispatch, useCallback, useEffect, useMemo, useState } from 'react'
import { TableOptions, useTable } from 'react-table'

import { ON_STATE_CHANGE_TRIGGERS } from '../../constants'
import {
  IRelatableStateInstance,
  StateChangeHandler,
  ToolbarAction,
  ToolbarActionDispatch
} from '../../relatable.types'
import getRelatableAddOns from '../../utils/get-relatable-add-ons'
import {
  getRelatableGlobalActions,
  getRelatableTableActions
} from '../../utils/relatable-actions'
import { TextCell } from '../renderers'
import { IRelatableProps } from './relatable'
import { pick } from 'shared/utils/array-utils'

export function useRelatableActions(): [
  ToolbarAction | null,
  ToolbarActionDispatch,
  Dispatch<void>
] {
  const [action, setAction] = useState<ToolbarAction | null>(null)
  const clearAction = useCallback(() => setAction(null), [setAction])
  const setToolbarAction = useCallback(
    (name: string, column: any) =>
      setAction({
        name,
        column
      }),
    [setAction]
  )

  return [action, setToolbarAction, clearAction]
}

// always memoize...
const getCellColSpanDefault = () => undefined
const DEFAULT_COLUMN = {}

export function useRelatableState<
  Data extends object = any,
  IInstance extends IRelatableStateInstance = IRelatableStateInstance<Data>
>(props: IRelatableProps<Data>): IRelatableStateInstance<Data> {
  const {
    columns,
    data,
    onStateChange,
    defaultColumn = DEFAULT_COLUMN,
    getCellColSpan = getCellColSpanDefault
  } = props

  // prepare add-ons and extract return values
  const addOns = getRelatableAddOns(props)
  const availableGlobalActions = getRelatableGlobalActions(addOns)
  const availableTableActions = getRelatableTableActions(addOns)
  const tableParamFactories = addOns.map(prep => prep[3])
  const tableStateFactories = addOns.map(prep => prep[4])
  const reactTableHooks = addOns.map(prep => prep[5])

  // prepare table params and context values
  const stateParams = tableStateFactories.reduce(
    (agg, fac) => Object.assign(agg, fac(agg) || {}),
    {}
  )
  const tableParams: TableOptions<Data> = tableParamFactories.reduce(
    // @ts-ignore
    (agg, fac) => Object.assign(agg, fac(agg) || {}),
    {
      columns,
      data,
      state: stateParams,
      getCustomCellColSpan: getCellColSpan,
      useControlledState: (state: any) =>
        useMemo(
          () => Object.assign({}, state, stateParams),
          [state, Object.values(stateParams)]
        ),
      defaultColumn: useMemo(
        () => ({
          Cell: TextCell,
          ...defaultColumn
        }),
        [defaultColumn]
      )
    }
  )
  const contextValue = useTable<Data>(tableParams, ...reactTableHooks)

  // add additional values for context
  const added = {
    ...contextValue,
    availableGlobalActions,
    availableTableActions,
    // @todo: cleanup
    _originalColumns: columns,
    // @todo: figure out a cleaner way of detecting and passing rows to use based on addOns used
    // @ts-ignore
    _rowsToUse: contextValue.page || contextValue.rows
  } as IInstance

  // hoist and override react-table state
  useOnStateChange(added, onStateChange)

  return added
}

export function useOnStateChange<
  Data extends object = any,
  IInstance extends IRelatableStateInstance = IRelatableStateInstance<Data>
>({ state: tableState }: IInstance, onStateChange?: StateChangeHandler) {
  const toOutside = pick(tableState, ON_STATE_CHANGE_TRIGGERS)
  const [oldState, setOldState] = useState(toOutside)

  // callback
  useEffect(() => {
    if (!onStateChange) return

    const changedKeys = Object.keys(toOutside).filter(
      key => toOutside[key] !== oldState[key]
    )

    setOldState(toOutside)
    onStateChange(toOutside, changedKeys)
  }, [onStateChange, ...Object.values(toOutside)]) // spread to prevent double trigger
}
