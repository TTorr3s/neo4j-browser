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
import { map } from 'lodash-es'
import React, { useCallback } from 'react'

import { useRelatableStateContext } from '../states'
import arrayHasItems from '../utils/array-has-items'
import { columnHasActions } from '../utils/column-actions'
import getRowNumber from '../utils/get-row-number'
import getSemanticTableProps from '../utils/get-semantic-table-props'
import isLastIndex from '../utils/is-last-index'
import ColumnActions from './column-actions'
import { BodyRow } from './renderers'
import RowActions from './renderers/row-actions'
import {
  StyledTable,
  StyledTableHeader,
  StyledTableBody,
  StyledTableRow,
  StyledTableHeaderCell,
  StyledTableCell
} from './styled'

export interface ITableProps {
  // used for rendering loading animation and empty rows
  loading?: boolean
  expectedRowCount?: number
  headless?: boolean

  // semantic ui react props https://react.semantic-ui.com/collections/table/
  attached?: boolean | string
  basic?: boolean | string
  className?: string
  collapsing?: boolean
  color?: string
  compact?: boolean | string
  definition?: boolean
  fixed?: boolean
  inverted?: boolean
  padded?: boolean | string
  singleLine?: boolean
  size?: string
  striped?: boolean
  structured?: boolean
  textAlign?: string
  verticalAlign?: string
}

export default function Table({
  loading,
  expectedRowCount,
  headless,
  ...rest
}: ITableProps): JSX.Element {
  const {
    getTableProps,
    headerGroups,
    state: { pageIndex = 0, pageSize = 1 },
    _rowsToUse: rows, // @todo: handle this more gracefully inside addOns
    prepareRow,
    availableTableActions,
    onCustomSelectionChange
  } = useRelatableStateContext()
  const { className = '', ...semanticTableProps } = getSemanticTableProps(rest)
  const onSelectAllClick = useCallback(
    (select: boolean) => {
      onCustomSelectionChange!(rows, select)
    },
    [onCustomSelectionChange, rows]
  )

  return (
    <StyledTable
      {...getTableProps()}
      $celled={semanticTableProps.celled}
      $compact={semanticTableProps.compact}
      $striped={semanticTableProps.striped}
      $basic={semanticTableProps.basic}
      $fixed={semanticTableProps.fixed}
      $singleLine={semanticTableProps.singleLine}
      $inverted={semanticTableProps.inverted}
      $collapsing={semanticTableProps.collapsing}
      $padded={semanticTableProps.padded}
      $structured={semanticTableProps.structured}
      $definition={semanticTableProps.definition}
      className={`relatable__table ${className}`}
    >
      {!headless && (
        <StyledTableHeader>
          {map(headerGroups, (headerGroup, index: number) => {
            const { key: headerGroupKey, ...headerGroupProps } =
              headerGroup.getHeaderGroupProps()
            return (
              <StyledTableRow
                key={headerGroupKey}
                {...headerGroupProps}
                className="relatable__table-row relatable__table-header-row"
              >
                <StyledTableHeaderCell
                  className="relatable__table-cell relatable__table-header-cell relatable__table-header-actions-cell"
                  $collapsing
                >
                  {isLastIndex(headerGroups, index) && (
                    <RowActions
                      rows={rows}
                      onSelectClick={
                        onCustomSelectionChange && onSelectAllClick
                      }
                    />
                  )}
                </StyledTableHeaderCell>
                {map(headerGroup.headers, (column: any) => {
                  const { key: headerKey, ...headerProps } =
                    column.getHeaderProps()
                  const hasActions =
                    isLastIndex(headerGroups, index) &&
                    columnHasActions(column, availableTableActions)

                  if (column.colSpan === 0) return null

                  return hasActions ? (
                    <ColumnActions
                      key={headerKey}
                      column={column}
                      {...headerProps}
                    />
                  ) : (
                    <StyledTableHeaderCell
                      key={headerKey}
                      {...headerProps}
                      colSpan={
                        column.colSpan !== undefined
                          ? column.colSpan
                          : headerProps.colSpan
                      }
                      className="relatable__table-cell relatable__table-header-cell"
                    >
                      {column.render('Header')}
                    </StyledTableHeaderCell>
                  )
                })}
              </StyledTableRow>
            )
          })}
        </StyledTableHeader>
      )}
      <StyledTableBody>
        {map(rows, (row, index: number) => {
          prepareRow(row)
          const { key: rowKey, ...rowProps } = row.getRowProps()

          return (
            <BodyRow
              key={rowKey}
              row={row}
              rowNumber={getRowNumber(index, pageIndex, pageSize)}
              loading={loading}
              {...rowProps}
            />
          )
        })}
        {/* render empty rows when passed expectedRowCount and no data */}
        {!arrayHasItems(rows) && loading && expectedRowCount
          ? map(Array(expectedRowCount), (_, index) => (
              <StyledTableRow
                key={`empty-row-${index}`}
                className="relatable__table-row relatable__table-body-row"
              >
                <StyledTableCell
                  className="relatable__table-cell relatable__table-body-cell"
                  colSpan={100}
                >
                  <div className="relatable__table-body-cell-loader" />
                </StyledTableCell>
              </StyledTableRow>
            ))
          : null}
      </StyledTableBody>
    </StyledTable>
  )
}
