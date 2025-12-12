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
import React, { type JSX } from 'react'
import styled from 'styled-components'

import { IWithPaginationInstance } from '../add-ons'
import { useRelatableStateContext } from '../states'
import FormSelect from './FormSelect'
import { Form, FormField } from './styled'

export interface IPaginationProps {
  totalPages?: number
}

const PaginationWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const PaginationButton = styled.button<{ $disabled?: boolean }>`
  background: #fff;
  border: 1px solid rgba(34, 36, 38, 0.15);
  color: rgba(0, 0, 0, 0.87);
  padding: 0.5em 1em;
  font-size: 0.9rem;
  border-radius: 0.28571429rem;
  cursor: ${props => (props.$disabled ? 'not-allowed' : 'pointer')};
  opacity: ${props => (props.$disabled ? 0.45 : 1)};
  transition:
    background-color 0.1s ease,
    color 0.1s ease;
  min-width: 2.5em;

  &:hover:not(:disabled) {
    background-color: #f8f8f8;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

const PageInfo = styled.span`
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.9rem;
`

export default function Pagination(_props: IPaginationProps = {}): JSX.Element {
  const {
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    onCustomPageChange,
    customPageSizeOptions,
    setPageSize,
    onCustomPageSizeChange,
    state: { pageIndex, pageSize }
  } = useRelatableStateContext<any, IWithPaginationInstance>()
  const pageSetter = onCustomPageChange || gotoPage
  const pageSizeSetter = onCustomPageSizeChange || setPageSize
  const pageSizeOptions = map(customPageSizeOptions, opt => ({
    key: opt,
    value: opt,
    text: opt
  }))

  return (
    <Form as="div" className="relatable__pagination">
      <PaginationWrapper>
        <FormField style={{ margin: 0 }}>
          <PaginationButton
            $disabled={!canPreviousPage}
            disabled={!canPreviousPage}
            onClick={() => pageSetter(0)}
            title="First page"
          >
            ⟨⟨
          </PaginationButton>
          <PaginationButton
            $disabled={!canPreviousPage}
            disabled={!canPreviousPage}
            onClick={() => pageSetter(pageIndex - 1)}
            title="Previous page"
          >
            ⟨
          </PaginationButton>
          <PageInfo>
            Page {pageIndex + 1} of {pageCount}
          </PageInfo>
          <PaginationButton
            $disabled={!canNextPage}
            disabled={!canNextPage}
            onClick={() => pageSetter(pageIndex + 1)}
            title="Next page"
          >
            ⟩
          </PaginationButton>
          <PaginationButton
            $disabled={!canNextPage}
            disabled={!canNextPage}
            onClick={() => pageSetter(pageCount - 1)}
            title="Last page"
          >
            ⟩⟩
          </PaginationButton>
        </FormField>
        <FormSelect
          label="Rows"
          inline
          className="relatable__pagination-size-setter"
          options={pageSizeOptions}
          value={pageSize}
          onChange={(_, { value }) => pageSizeSetter(Number(value))}
        />
      </PaginationWrapper>
    </Form>
  )
}
