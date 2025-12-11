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
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { connect } from 'react-redux'
import { withBus } from 'react-suber'
import { Bus } from 'suber'

import { ConfirmationButton } from 'browser-components/buttons/ConfirmationButton'
import { Duration } from 'neo4j-driver'
import { GlobalState } from 'project-root/src/shared/globalState'
import { gte } from 'semver'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import {
  CONNECTED_STATE,
  getConnectionState
} from 'shared/modules/connections/connectionsDuck'
import { CYPHER_REQUEST } from 'shared/modules/cypher/cypherDuck'
import {
  getRawVersion,
  getSemanticVersion,
  hasProcedure,
  isOnCluster
} from 'shared/modules/dbMeta/dbMetaDuck'
import { Frame } from 'shared/modules/frames/framesDuck'
import FrameBodyTemplate from '../../Frame/FrameBodyTemplate'
import FrameError from '../../Frame/FrameError'
import {
  AutoRefreshSpan,
  AutoRefreshToggle,
  StatusbarWrapper,
  StyledStatusBar
} from '../AutoRefresh/styled'
import LegacyQueriesFrame, {
  LegacyQueriesFrameProps
} from './LegacyQueriesFrame'
import {
  Code,
  StyledHeaderRow,
  StyledTable,
  StyledTableWrapper,
  StyledTd,
  StyledTh
} from './styled'

type QueriesFrameProps = {
  frame?: Frame
  bus: Bus
  connectionState: number
  isFullscreen: boolean
  isCollapsed: boolean
}

const AUTO_REFRESH_INTERVAL = 20 // seconds

function constructOverviewMessage(queries: any[], errors: string[]) {
  const numQueriesMsg = queries.length > 1 ? 'queries' : 'query'
  const successMessage = `Found ${queries.length} ${numQueriesMsg} on one server (neo4j 5.0 clusters not yet supported).`

  return errors.length > 0
    ? `${successMessage} (${errors.length} unsuccessful)`
    : successMessage
}

function prettyPrintDuration(duration: Duration) {
  const { months, days, seconds, nanoseconds } = duration

  let resultsString = ''
  if (months.toNumber() > 0) {
    resultsString += `${months} months, `
  }
  if (days.toNumber() > 0) {
    resultsString += `${days} days, `
  }
  const millis = seconds.toNumber() * 1000 + nanoseconds.toNumber() / 1000000
  resultsString += `${millis} ms`

  return resultsString
}

export const QueriesFrame = ({
  frame,
  bus,
  connectionState,
  isFullscreen,
  isCollapsed
}: QueriesFrameProps) => {
  const [queries, setQueries] = useState<any[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessages, setErrorMessages] = useState<string[]>([])

  const timerRef = useRef<number | null>(null)
  const prevFrameTsRef = useRef<number | undefined>(frame?.ts)

  const getRunningQueries = useCallback(
    (suppressQuerySuccessMessage = false): void => {
      bus.self(
        CYPHER_REQUEST,
        {
          query:
            'SHOW TRANSACTIONS YIELD currentQuery, username, metaData, parameters, status, elapsedTime, database, transactionId',
          queryType: NEO4J_BROWSER_USER_ACTION_QUERY
        },
        resp => {
          if (resp.success) {
            const queriesResult = resp.result.records.map(
              ({ host, keys, _fields, error }: any) => {
                if (error) return { error }
                const nonNullHost = host ?? resp.result.summary.server.address
                const data: any = {}
                keys.forEach((key: string, idx: number) => {
                  data[key] = _fields[idx]
                })

                return {
                  ...data,
                  host: `neo4j://${nonNullHost}`,
                  query: data.currentQuery,
                  elapsedTimeMillis: prettyPrintDuration(data.elapsedTime),
                  queryId: data.transactionId
                }
              }
            )

            const errors = queriesResult
              .filter((_: any) => _.error)
              .map((e: any) => ({
                ...e.error
              }))
            const validQueries = queriesResult.filter((_: any) => !_.error)
            const resultMessage = constructOverviewMessage(validQueries, errors)

            setQueries(validQueries)
            setErrorMessages(errors)
            if (!suppressQuerySuccessMessage) {
              setSuccessMessage(resultMessage)
            }
          }
        }
      )
    },
    [bus]
  )

  const killQueries = useCallback(
    (queryIdList: string[]): void => {
      bus.self(
        CYPHER_REQUEST,
        {
          query: `TERMINATE TRANSACTIONS ${queryIdList
            .map(q => `"${q}"`)
            .join(',')}`,
          queryType: NEO4J_BROWSER_USER_ACTION_QUERY
        },
        (response: any) => {
          if (response.success) {
            setSuccessMessage('Query successfully cancelled')
            setErrorMessages([])
            getRunningQueries(true)
          } else {
            setErrorMessages(prev => [...prev, response.error.message])
            setSuccessMessage(null)
          }
        }
      )
    },
    [bus, getRunningQueries]
  )

  const killQuery = useCallback(
    (queryId: string): void => {
      killQueries([queryId])
    },
    [killQueries]
  )

  const handleAutoRefreshChange = useCallback(
    (checked: boolean): void => {
      setAutoRefresh(checked)
      if (checked) {
        getRunningQueries()
      }
    },
    [getRunningQueries]
  )

  // Initial fetch on mount
  useEffect(() => {
    if (connectionState === CONNECTED_STATE) {
      getRunningQueries()
    } else {
      setErrorMessages(['Unable to connect to neo4j'])
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = window.setInterval(
        getRunningQueries,
        AUTO_REFRESH_INTERVAL * 1000
      )
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [autoRefresh, getRunningQueries])

  // Handle frame rerun
  useEffect(() => {
    if (frame && frame.ts !== prevFrameTsRef.current && frame.isRerun) {
      getRunningQueries()
    }
    prevFrameTsRef.current = frame?.ts
  }, [frame, getRunningQueries])

  const constructViewFromQueryList = useCallback((): JSX.Element | null => {
    if (queries.length === 0) {
      return null
    }
    const tableHeaderSizes = [
      ['Database', '8%'],
      ['User', '8%'],
      ['Query', 'auto'],
      ['Params', '7%'],
      ['Meta', 'auto'],
      ['Elapsed time', '95px'],
      ['Kill', '95px']
    ]

    return (
      <StyledTableWrapper>
        <StyledTable>
          <thead>
            <StyledHeaderRow>
              {tableHeaderSizes.map(heading => (
                <StyledTh width={heading[1]} key={heading[0]}>
                  {heading[0]}
                </StyledTh>
              ))}
            </StyledHeaderRow>
          </thead>
          <tbody>
            {queries.map((query: any, i: number) => (
              <tr key={`rows${i}`}>
                <StyledTd
                  key="db"
                  title={query.database}
                  width={tableHeaderSizes[0][1]}
                >
                  <Code>{query.database}</Code>
                </StyledTd>
                <StyledTd key="username" width={tableHeaderSizes[1][1]}>
                  {query.username}
                </StyledTd>
                <StyledTd
                  key="query"
                  title={query.query}
                  width={tableHeaderSizes[2][1]}
                >
                  <Code>{query.query}</Code>
                </StyledTd>
                <StyledTd key="params" width={tableHeaderSizes[3][1]}>
                  <Code>{JSON.stringify(query.parameters, null, 2)}</Code>
                </StyledTd>
                <StyledTd
                  key="meta"
                  title={JSON.stringify(query.metaData, null, 2)}
                  width={tableHeaderSizes[4][1]}
                >
                  <Code>{JSON.stringify(query.metaData, null, 2)}</Code>
                </StyledTd>
                <StyledTd key="time" width={tableHeaderSizes[5][1]}>
                  {query.elapsedTimeMillis}
                </StyledTd>
                <StyledTd key="actions" width={tableHeaderSizes[6][1]}>
                  <ConfirmationButton
                    onConfirmed={() => killQuery(query.queryId)}
                  />
                </StyledTd>
              </tr>
            ))}

            {errorMessages.map((error: any, i: number) => (
              <tr key={`error${i}`}>
                <StyledTd colSpan={7} title={error.message}>
                  <Code>Error connecting to: {error.host}</Code>
                </StyledTd>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </StyledTableWrapper>
    )
  }, [queries, errorMessages, killQuery])

  return (
    <FrameBodyTemplate
      isCollapsed={isCollapsed}
      isFullscreen={isFullscreen}
      contents={constructViewFromQueryList()}
      statusBar={
        <StatusbarWrapper>
          {successMessage ? (
            <StyledStatusBar>
              {successMessage}
              <AutoRefreshSpan>
                <AutoRefreshToggle
                  checked={autoRefresh}
                  onChange={e => handleAutoRefreshChange(e.target.checked)}
                />
              </AutoRefreshSpan>
            </StyledStatusBar>
          ) : (
            errorMessages && <FrameError message={errorMessages.join(',')} />
          )}
        </StatusbarWrapper>
      }
    />
  )
}

const mapStateToProps = (state: GlobalState) => {
  const version = getSemanticVersion(state)
  const versionOverFive = version
    ? gte(version, '5.0.0')
    : true /* assume we're 5.0 */

  return {
    hasListQueriesProcedure: hasProcedure(state, 'dbms.listQueries'),
    versionOverFive,
    connectionState: getConnectionState(state),
    neo4jVersion: getRawVersion(state),
    isOnCluster: isOnCluster(state)
  }
}

export default withBus(
  connect(mapStateToProps)((props: LegacyQueriesFrameProps) => {
    return props.versionOverFive ? (
      <QueriesFrame {...props} />
    ) : (
      <LegacyQueriesFrame {...props} />
    )
  })
)
