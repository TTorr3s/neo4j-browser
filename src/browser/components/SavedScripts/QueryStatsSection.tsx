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
import React, { type JSX, useState } from 'react'

import { BinIcon, PlainPlayIcon } from '../icons/LegacyIcons'
import {
  QueryStatsItem,
  QueryStatsItemActions,
  QueryStatsItemCount,
  QueryStatsItemText,
  QueryStatsSectionContainer,
  QueryStatsSectionHeader,
  StyledSavedScriptsButton
} from './styled'
import { QueryStat } from 'shared/services/queryStatsStorage'

interface QueryStatsSectionProps {
  title: string
  queries: QueryStat[]
  onSelect: (query: string) => void
  onExec: (query: string) => void
  showCount?: boolean
  onClear?: () => void
}

export default function QueryStatsSection({
  title,
  queries,
  onSelect,
  onExec,
  showCount = false,
  onClear
}: QueryStatsSectionProps): JSX.Element | null {
  const [confirming, setConfirming] = useState(false)

  if (queries.length === 0) {
    return null
  }

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirming) {
      onClear?.()
      setConfirming(false)
    } else {
      setConfirming(true)
    }
  }

  const handleCancelConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <QueryStatsSectionContainer>
      <QueryStatsSectionHeader>
        <span>{title}</span>
        {onClear && (
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
            {confirming && (
              <StyledSavedScriptsButton
                onClick={handleCancelConfirm}
                title="Cancel"
                style={{ fontSize: '10px', padding: '0 3px' }}
              >
                Cancel
              </StyledSavedScriptsButton>
            )}
            <StyledSavedScriptsButton
              onClick={handleClearClick}
              title={confirming ? 'Confirm clear' : 'Clear stats'}
              color={confirming ? '#e74c3c' : undefined}
              style={{ padding: '0 3px' }}
            >
              <BinIcon />
            </StyledSavedScriptsButton>
          </span>
        )}
      </QueryStatsSectionHeader>
      {queries.map(stat => (
        <QueryStatsItem key={stat.id} onClick={() => onSelect(stat.query)}>
          <QueryStatsItemText>{stat.query}</QueryStatsItemText>
          {showCount && (
            <QueryStatsItemCount>{stat.executionCount}x</QueryStatsItemCount>
          )}
          <QueryStatsItemActions>
            <StyledSavedScriptsButton
              onClick={e => {
                e.stopPropagation()
                onExec(stat.query)
              }}
              title="Run"
            >
              <PlainPlayIcon />
            </StyledSavedScriptsButton>
          </QueryStatsItemActions>
        </QueryStatsItem>
      ))}
    </QueryStatsSectionContainer>
  )
}
