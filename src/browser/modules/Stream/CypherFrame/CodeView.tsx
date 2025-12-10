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
/* eslint-disable react/prop-types */
import { map, take } from 'lodash-es'
import React, { useState, memo } from 'react'
import { useSelector } from 'react-redux'

import {
  PaddedDiv,
  StyledAlteringTr,
  StyledExpandable,
  StyledStrongTd,
  StyledTBody,
  StyledTable,
  StyledTd
} from '../styled'
import {
  RelatableStatusbar,
  RelatableStatusbarComponent
} from './RelatableView/relatable-view'
import { deepEquals } from 'neo4j-arc/common'
import { GlobalState } from 'shared/globalState'
import { getMaxFieldItems } from 'shared/modules/settings/settingsDuck'

interface ExpandableContentProps {
  title: string
  content: React.ReactNode
  summary: string
}

const ExpandableContent: React.FC<ExpandableContentProps> = ({
  title,
  content,
  summary
}) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <StyledAlteringTr>
      <StyledStrongTd>
        {title}
        <StyledExpandable
          onClick={() => setExpanded(!expanded)}
          className={expanded ? 'fa fa-caret-down' : 'fa fa-caret-right'}
          title={expanded ? 'Hide section' : 'Expand section'}
        />
      </StyledStrongTd>
      <StyledTd>{expanded ? content : summary}</StyledTd>
    </StyledAlteringTr>
  )
}

const fieldLimiterFactory =
  (maxFieldItems: number) => (key: string, val: unknown) => {
    if (!maxFieldItems || key !== '_fields') {
      return val
    }

    return map(val as unknown[], field => {
      return Array.isArray(field) ? take(field, maxFieldItems) : field
    })
  }

interface CodeViewComponentProps {
  result?: unknown
  request?: Record<string, unknown>
  query?: string
  maxFieldItems?: number
}

export const CodeViewComponent: React.FC<CodeViewComponentProps> = memo(
  ({ request = {}, query, maxFieldItems }) => {
    if (request.status !== 'success') return null

    const requestResult = request.result as {
      records: unknown[]
      summary: {
        server: {
          agent: string
          address: string
        }
      }
    }

    const resultJson = JSON.stringify(
      requestResult.records,
      fieldLimiterFactory(maxFieldItems ?? 0),
      2
    )
    const summaryJson = JSON.stringify(
      requestResult.summary,
      fieldLimiterFactory(maxFieldItems ?? 0),
      2
    )

    return (
      <PaddedDiv>
        <StyledTable>
          <StyledTBody>
            <StyledAlteringTr>
              <StyledStrongTd>Server version</StyledStrongTd>
              <StyledTd>{requestResult.summary.server.agent}</StyledTd>
            </StyledAlteringTr>
            <StyledAlteringTr>
              <StyledStrongTd>Server address</StyledStrongTd>
              <StyledTd>{requestResult.summary.server.address}</StyledTd>
            </StyledAlteringTr>
            <StyledAlteringTr>
              <StyledStrongTd>Query</StyledStrongTd>
              <StyledTd>{query}</StyledTd>
            </StyledAlteringTr>
            <ExpandableContent
              title="Summary"
              content={<pre>{summaryJson}</pre>}
              summary={summaryJson.split('\n').slice(0, 3) + ' ...'}
            />
            <ExpandableContent
              title="Response"
              content={<pre>{resultJson}</pre>}
              summary={resultJson.split('\n').slice(0, 3) + ' ...'}
            />
          </StyledTBody>
        </StyledTable>
      </PaddedDiv>
    )
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (component should NOT update)
    // Return false if props are different (component SHOULD update)
    if (!prevProps.result) return false
    return deepEquals(prevProps.result, nextProps.result)
  }
)

CodeViewComponent.displayName = 'CodeViewComponent'

interface CodeViewProps {
  result?: unknown
  request?: Record<string, unknown>
  query?: string
}

export const CodeView: React.FC<CodeViewProps> = props => {
  const maxFieldItems = useSelector((state: GlobalState) =>
    getMaxFieldItems(state)
  )

  return <CodeViewComponent {...props} maxFieldItems={maxFieldItems} />
}

export const CodeStatusbarComponent = RelatableStatusbarComponent
export const CodeStatusbar = RelatableStatusbar
