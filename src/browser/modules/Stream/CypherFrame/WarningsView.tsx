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
import React, { memo } from 'react'
import { useSelector } from 'react-redux'
import { gte } from 'semver'

import {
  StyledBr,
  StyledCypherErrorMessage,
  StyledCypherMessage,
  StyledCypherWarningMessage,
  StyledDiv,
  StyledH4,
  StyledHelpContent,
  StyledHelpDescription,
  StyledHelpFrame,
  StyledPreformattedArea,
  StyledCode,
  StyledCypherInfoMessage
} from '../styled'
import { deepEquals } from 'neo4j-arc/common'
import {
  formatSummaryFromGqlStatusObjects,
  formatSummaryFromNotifications,
  FormattedNotification
} from './warningUtilts'
import { NotificationSeverityLevel } from 'neo4j-driver-core'
import { GlobalState } from 'shared/globalState'
import { getSemanticVersion } from 'shared/modules/dbMeta/dbMetaDuck'
import { FIRST_GQL_NOTIFICATIONS_SUPPORT } from 'shared/modules/features/versionedFeatures'
import { shouldShowGqlErrorsAndNotifications } from 'shared/modules/settings/settingsDuck'
import { BrowserRequestResult } from 'shared/modules/requests/requestsDuck'

const getWarningComponent = (severity?: string | NotificationSeverityLevel) => {
  if (severity === 'ERROR') {
    return <StyledCypherErrorMessage>{severity}</StyledCypherErrorMessage>
  } else if (severity === 'WARNING') {
    return <StyledCypherWarningMessage>{severity}</StyledCypherWarningMessage>
  } else if (severity === 'INFORMATION') {
    return <StyledCypherInfoMessage>{severity}</StyledCypherInfoMessage>
  } else {
    return <StyledCypherMessage>{severity}</StyledCypherMessage>
  }
}

export type WarningsViewProps = {
  result?: BrowserRequestResult
  /** @deprecated This prop is not used but kept for API compatibility */
  updated?: number
}

const selectGqlWarningsEnabled = (state: GlobalState): boolean => {
  const featureEnabled = shouldShowGqlErrorsAndNotifications(state)
  const version = getSemanticVersion(state)
  return version
    ? featureEnabled && gte(version, FIRST_GQL_NOTIFICATIONS_SUPPORT)
    : false
}

const WarningsViewComponent = ({
  result
}: WarningsViewProps): JSX.Element | null => {
  const gqlWarningsEnabled = useSelector(selectGqlWarningsEnabled)

  // Check if result is a valid QueryResult with summary (not undefined, null, or BrowserError)
  if (
    result === undefined ||
    result === null ||
    !('summary' in result) ||
    result.summary === undefined
  ) {
    return null
  }

  const { summary } = result
  const notifications = gqlWarningsEnabled
    ? formatSummaryFromGqlStatusObjects(summary)
    : formatSummaryFromNotifications(summary)
  const { text: cypher = '' } = summary.query

  if (!notifications || !cypher) {
    return null
  }

  const cypherLines = cypher.split('\n')
  const notificationsList = notifications.map(
    (notification: FormattedNotification) => {
      // Detect generic warning without position information
      const { code, description, severity } = notification
      const position = notification.position ?? { line: 1, offset: 0 }
      const title = notification.title ?? ''
      const line = position.line ?? 1
      const offset = position.offset ?? 0

      return (
        <StyledHelpContent key={title + line + position.offset}>
          <StyledHelpDescription>
            {getWarningComponent(severity)}
            <StyledH4>{title}</StyledH4>
          </StyledHelpDescription>
          <StyledDiv>
            <StyledHelpDescription>{description}</StyledHelpDescription>
            <StyledDiv>
              <StyledPreformattedArea>
                {cypherLines[line - 1]}
                <StyledBr />
                {Array(offset + 1).join(' ')}^
              </StyledPreformattedArea>
            </StyledDiv>
          </StyledDiv>
          {code && (
            <StyledDiv style={{ marginTop: '10px' }}>
              Status code: <StyledCode>{code}</StyledCode>
            </StyledDiv>
          )}
        </StyledHelpContent>
      )
    }
  )
  return <StyledHelpFrame>{notificationsList}</StyledHelpFrame>
}

/**
 * Custom comparison function for React.memo
 * Returns true if props are equal (should NOT re-render)
 * Returns false if props are different (should re-render)
 */
const arePropsEqual = (
  prevProps: WarningsViewProps,
  nextProps: WarningsViewProps
): boolean => {
  if (!prevProps.result) return false

  const prevSummary =
    prevProps.result && 'summary' in prevProps.result
      ? prevProps.result.summary
      : undefined
  const nextSummary =
    nextProps.result && 'summary' in nextProps.result
      ? nextProps.result.summary
      : undefined

  return deepEquals(prevSummary, nextSummary)
}

export const WarningsView = memo(WarningsViewComponent, arePropsEqual)

export type WarningsStatusbarProps = {
  result?: BrowserRequestResult
  updated?: number
}

/**
 * WarningsStatusbar is a no-op component that never renders anything
 * and never updates. Maintained for backwards compatibility.
 */
export const WarningsStatusbar = memo(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function WarningsStatusbar(_props: WarningsStatusbarProps): null {
    return null
  },
  () => true // Never re-render
)
