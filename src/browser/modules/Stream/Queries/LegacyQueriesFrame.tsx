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
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Bus } from 'suber'

import FrameAside from '../../Frame/FrameAside'
import FrameBodyTemplate from '../../Frame/FrameBodyTemplate'
import FrameError from '../../Frame/FrameError'
import {
  AutoRefreshSpan,
  AutoRefreshToggle,
  StatusbarWrapper,
  StyledStatusBar
} from '../AutoRefresh/styled'
import {
  Code,
  StyledHeaderRow,
  StyledTable,
  StyledTableWrapper,
  StyledTd,
  StyledTh
} from './styled'
import { EnterpriseOnlyFrame } from 'browser-components/EditionView'
import { ConfirmationButton } from 'browser-components/buttons/ConfirmationButton'
import bolt from 'services/bolt/bolt'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import { CONNECTED_STATE } from 'shared/modules/connections/connectionsDuck'
import {
  AD_HOC_CYPHER_REQUEST,
  CLUSTER_CYPHER_REQUEST,
  CYPHER_REQUEST
} from 'shared/modules/cypher/cypherDuck'
import {
  killQueriesProcedure,
  listQueriesProcedure
} from 'shared/modules/cypher/queriesProcedureHelper'

import { getDefaultBoltScheme } from 'shared/modules/features/versionedFeatures'

export type LegacyQueriesFrameProps = {
  frame: any
  bus: Bus
  hasListQueriesProcedure: boolean
  connectionState: number
  neo4jVersion: string | null
  isFullscreen: boolean
  versionOverFive: boolean
  isCollapsed: boolean
  isOnCluster: boolean
}

type LegacyQueriesFrameState = {
  queries: any[]
  autoRefresh: boolean
  autoRefreshInterval: number
  success: null | boolean | string | React.ReactNode
  errors: any[]
}

const AUTO_REFRESH_INTERVAL = 20 // seconds

export const LegacyQueriesFrame = ({
  frame,
  bus,
  hasListQueriesProcedure,
  connectionState,
  neo4jVersion,
  isFullscreen,
  isCollapsed,
  isOnCluster
}: LegacyQueriesFrameProps) => {
  const [queries, setQueries] = useState<any[]>([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [success, setSuccess] = useState<
    null | boolean | string | React.ReactNode
  >(null)
  const [errors, setErrors] = useState<any[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const prevFrameRef = useRef<{ ts?: number; isRerun?: boolean } | null>(null)
  const prevIsOnClusterRef = useRef<boolean>(isOnCluster)

  const extractQueriesFromBoltResult = useCallback(
    (result: any) => {
      return result.records.map(({ keys, _fields, host, error }: any) => {
        if (error) {
          return { error }
        }
        const queryInfo: any = {}
        keys.forEach((key: any, idx: any) => {
          queryInfo[key] = bolt.itemIntToNumber(_fields[idx])
        })
        if (host) {
          queryInfo.host = getDefaultBoltScheme(neo4jVersion) + host
        } else {
          queryInfo.host =
            getDefaultBoltScheme(neo4jVersion) + result.summary.server.address
        }
        return queryInfo
      })
    },
    [neo4jVersion]
  )

  const constructOverviewMessage = useCallback(
    (queriesList: any[], errorsList: any[]) => {
      const clusterCount = new Set(queriesList.map((query: any) => query.host))
        .size

      const numMachinesMsg =
        clusterCount > 1
          ? `running on ${clusterCount} cluster servers`
          : 'running on one server'

      const numQueriesMsg = queriesList.length > 1 ? 'queries' : 'query'

      const successMessage = `Found ${queriesList.length} ${numQueriesMsg} ${numMachinesMsg}`

      return errorsList.length > 0 ? (
        <span>
          {successMessage} ({errorsList.length} unsuccessful)
        </span>
      ) : (
        successMessage
      )
    },
    []
  )

  const getRunningQueries = useCallback(
    (suppressQuerySuccessMessage = false) => {
      bus.self(
        isOnCluster ? CLUSTER_CYPHER_REQUEST : CYPHER_REQUEST,
        {
          query: listQueriesProcedure(),
          queryType: NEO4J_BROWSER_USER_ACTION_QUERY
        },
        (response: any) => {
          if (response.success) {
            const extractedQueries = extractQueriesFromBoltResult(
              response.result
            )
            const newErrors = extractedQueries
              .filter((_: any) => _.error)
              .map((e: any) => ({
                ...e.error
              }))
            const validQueries = extractedQueries.filter((_: any) => !_.error)
            const resultMessage = constructOverviewMessage(
              validQueries,
              newErrors
            )

            setQueries(validQueries)
            setErrors(newErrors)
            if (!suppressQuerySuccessMessage) {
              setSuccess(resultMessage)
            }
          } else {
            setErrors(prevErrors => prevErrors.concat([response.error]))
            setSuccess(false)
          }
        }
      )
    },
    [bus, isOnCluster, extractQueriesFromBoltResult, constructOverviewMessage]
  )

  const killQueries = useCallback(
    (host: any, queryIdList: any) => {
      bus.self(
        isOnCluster ? AD_HOC_CYPHER_REQUEST : CYPHER_REQUEST,
        { host, query: killQueriesProcedure(queryIdList) },
        (response: any) => {
          if (response.success) {
            setSuccess('Query successfully cancelled')
            setErrors([])
            getRunningQueries(true)
          } else {
            setErrors(prevErrors => prevErrors.concat([response.error]))
            setSuccess(false)
          }
        }
      )
    },
    [bus, isOnCluster, getRunningQueries]
  )

  const onCancelQuery = useCallback(
    (host: any, queryId: any) => {
      killQueries(host, [queryId])
    },
    [killQueries]
  )

  const handleAutoRefreshChange = useCallback(
    (newAutoRefresh: boolean) => {
      setAutoRefresh(newAutoRefresh)

      if (newAutoRefresh) {
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
      setErrors([new Error('Unable to connect to bolt server')])
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh timer management
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        getRunningQueries()
      }, AUTO_REFRESH_INTERVAL * 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [autoRefresh, getRunningQueries])

  // Handle frame rerun and cluster change
  useEffect(() => {
    const prevFrame = prevFrameRef.current
    const prevIsOnCluster = prevIsOnClusterRef.current

    if (
      (frame && prevFrame && frame.ts !== prevFrame.ts && frame.isRerun) ||
      isOnCluster !== prevIsOnCluster
    ) {
      getRunningQueries()
    }

    prevFrameRef.current = frame
      ? { ts: frame.ts, isRerun: frame.isRerun }
      : null
    prevIsOnClusterRef.current = isOnCluster
  }, [frame, isOnCluster, getRunningQueries])

  const constructViewFromQueryList = useCallback(
    (queriesList: any[], errorsList: any[]) => {
      if (queriesList.length === 0) {
        return null
      }
      const tableHeaderSizes = [
        ['Database URI', '20%'],
        ['User', '8%'],
        ['Query', 'auto'],
        ['Params', '7%'],
        ['Meta', 'auto'],
        ['Elapsed time', '95px'],
        ['Kill', '95px']
      ]
      const tableRows = queriesList.map((query: any, i: any) => {
        return (
          <tr key={`rows${i}`}>
            <StyledTd
              key="host"
              title={query.host}
              width={tableHeaderSizes[0][1]}
            >
              <Code>{query.host}</Code>
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
              {query.elapsedTimeMillis} ms
            </StyledTd>
            <StyledTd key="actions" width={tableHeaderSizes[6][1]}>
              <ConfirmationButton
                onConfirmed={() => onCancelQuery(query.host, query.queryId)}
              />
            </StyledTd>
          </tr>
        )
      })

      const errorRows = errorsList.map((error: any, i: any) => (
        <tr key={`error${i}`}>
          <StyledTd colSpan={7} title={error.message}>
            <Code>Error connecting to: {error.host}</Code>
          </StyledTd>
        </tr>
      ))

      const tableHeaders = tableHeaderSizes.map(heading => {
        return (
          <StyledTh width={heading[1]} key={heading[0]}>
            {heading[0]}
          </StyledTh>
        )
      })
      return (
        <StyledTableWrapper>
          <StyledTable>
            <thead>
              <StyledHeaderRow>{tableHeaders}</StyledHeaderRow>
            </thead>
            <tbody>
              {tableRows}
              {errorRows}
            </tbody>
          </StyledTable>
        </StyledTableWrapper>
      )
    },
    [onCancelQuery]
  )

  let frameContents
  let aside
  let statusBar

  if (hasListQueriesProcedure || connectionState !== CONNECTED_STATE) {
    frameContents = constructViewFromQueryList(queries, errors)
    statusBar = (
      <StatusbarWrapper>
        {errors && !success && (
          <FrameError
            message={(errors || [])
              .map((e: any) => `${e.host}: ${e.message}`)
              .join(', ')}
          />
        )}
        {success && (
          <StyledStatusBar>
            {success}
            <AutoRefreshSpan>
              <AutoRefreshToggle
                checked={autoRefresh}
                onChange={(e: any) => handleAutoRefreshChange(e.target.checked)}
              />
            </AutoRefreshSpan>
          </StyledStatusBar>
        )}
      </StatusbarWrapper>
    )
  } else {
    aside = (
      <FrameAside
        title="Frame unavailable"
        subtitle="What edition are you running?"
      />
    )
    frameContents = <EnterpriseOnlyFrame command=":queries" />
  }

  return (
    <FrameBodyTemplate
      isCollapsed={isCollapsed}
      isFullscreen={isFullscreen}
      aside={aside}
      contents={frameContents}
      statusBar={statusBar}
    />
  )
}

export default LegacyQueriesFrame
