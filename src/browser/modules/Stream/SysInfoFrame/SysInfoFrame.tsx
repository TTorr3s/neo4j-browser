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
import React, { useState, useCallback, useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import { withBus } from 'react-suber'
import { Bus } from 'suber'

import {
  ExclamationTriangleIcon,
  SpinnerIcon
} from 'browser-components/icons/LegacyIcons'

import {
  AutoRefreshSpan,
  AutoRefreshToggle,
  StatusbarWrapper,
  StyledStatusBar
} from '../AutoRefresh/styled'
import { ErrorsView } from '../CypherFrame/ErrorsView/ErrorsView'
import LegacySysInfoFrame from './LegacySysInfoFrame/LegacySysInfoFrame'
import { SysInfoTable } from './SysInfoTable'
import { InlineError } from './styled'
import * as helpers from './sysinfoHelpers'
import FrameBodyTemplate from 'browser/modules/Frame/FrameBodyTemplate'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import { GlobalState } from 'shared/globalState'
import {
  getUseDb,
  isConnected
} from 'shared/modules/connections/connectionsDuck'
import { CYPHER_REQUEST } from 'shared/modules/cypher/cypherDuck'
import {
  Database,
  getDatabases,
  getMetricsNamespacesEnabled,
  getMetricsPrefix,
  isEnterprise,
  isOnCluster
} from 'shared/modules/dbMeta/dbMetaDuck'
import { hasMultiDbSupport } from 'shared/modules/features/versionedFeatures'
import { Frame } from 'shared/modules/frames/framesDuck'
import {
  commandSources,
  executeCommand
} from 'shared/modules/commands/commandsDuck'
import { Action, Dispatch } from 'redux'
import { SpinnerContainer } from './styled'

export type DatabaseMetric = { label: string; value?: string }
export type SysInfoFrameState = {
  lastFetch?: null | number
  storeSizes: DatabaseMetric[]
  idAllocation: DatabaseMetric[]
  pageCache: DatabaseMetric[]
  transactions: DatabaseMetric[]
  clusterMembers: DatabaseMetric[]
  errorMessage: string | null
  results: boolean
  autoRefresh: boolean
  autoRefreshInterval: number
}

export type SysInfoFrameProps = {
  bus: Bus
  databases: Database[]
  frame: Frame
  hasMultiDbSupport: boolean
  isConnected: boolean
  isEnterprise: boolean
  isFullscreen: boolean
  isCollapsed: boolean
  isOnCluster: boolean
  namespacesEnabled: boolean
  metricsPrefix: string
  rerunWithDb: (cmd: { useDb: string; id: string }) => void
}

const AUTO_REFRESH_INTERVAL = 20 // seconds

export const SysInfoFrame = ({
  bus,
  databases,
  frame,
  hasMultiDbSupport,
  isConnected: connected,
  isEnterprise: enterprise,
  isFullscreen,
  isCollapsed,
  isOnCluster: onCluster,
  namespacesEnabled,
  metricsPrefix
}: SysInfoFrameProps): React.ReactElement<any> => {
  const [lastFetch, setLastFetch] = useState<number | null>(null)
  const [storeSizes, setStoreSizes] = useState<DatabaseMetric[]>([])
  const [idAllocation, setIdAllocation] = useState<DatabaseMetric[]>([])
  const [pageCache, setPageCache] = useState<DatabaseMetric[]>([])
  const [transactions, setTransactions] = useState<DatabaseMetric[]>([])
  const [clusterMembers, setClusterMembers] = useState<DatabaseMetric[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const timerRef = useRef<number | null>(null)

  // Create a setState-like function for the response handlers
  const updateState = useCallback((newState: Partial<SysInfoFrameState>) => {
    if (newState.lastFetch !== undefined) setLastFetch(newState.lastFetch)
    if (newState.storeSizes !== undefined) setStoreSizes(newState.storeSizes)
    if (newState.idAllocation !== undefined)
      setIdAllocation(newState.idAllocation)
    if (newState.pageCache !== undefined) setPageCache(newState.pageCache)
    if (newState.transactions !== undefined)
      setTransactions(newState.transactions)
    if (newState.clusterMembers !== undefined)
      setClusterMembers(newState.clusterMembers)
    if (newState.errorMessage !== undefined)
      setErrorMessage(newState.errorMessage)
  }, [])

  const runCypherQuery = useCallback(
    (query: string, responseHandler: (res: any) => void): void => {
      if (bus && connected) {
        setLastFetch(Date.now())
        bus.self(
          CYPHER_REQUEST,
          {
            query,
            queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
            useDb: frame.useDb
          },
          responseHandler
        )
        if (onCluster) {
          bus.self(
            CYPHER_REQUEST,
            {
              query: 'CALL dbms.cluster.overview',
              queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
              useDb: frame.useDb
            },
            helpers.clusterResponseHandler(updateState)
          )
        }
      }
    },
    [bus, connected, frame.useDb, onCluster, updateState]
  )

  const getSysInfo = useCallback((): void => {
    if (hasMultiDbSupport && frame.useDb) {
      runCypherQuery(
        helpers.sysinfoQuery({
          databaseName: frame.useDb,
          namespacesEnabled,
          metricsPrefix
        }),
        helpers.responseHandler(updateState)
      )
    }
  }, [
    hasMultiDbSupport,
    frame.useDb,
    namespacesEnabled,
    metricsPrefix,
    runCypherQuery,
    updateState
  ])

  const handleAutoRefreshChange = useCallback(
    (newAutoRefresh: boolean): void => {
      setAutoRefresh(newAutoRefresh)
      if (newAutoRefresh) {
        getSysInfo()
      }
    },
    [getSysInfo]
  )

  // Initial fetch on mount
  useEffect(() => {
    getSysInfo()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when dependencies change
  useEffect(() => {
    getSysInfo()
  }, [frame.useDb, namespacesEnabled, metricsPrefix]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle auto-refresh timer
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = window.setInterval(
        getSysInfo,
        AUTO_REFRESH_INTERVAL * 1000
      )
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [autoRefresh, getSysInfo])

  const content = connected ? (
    <SysInfoTable
      pageCache={pageCache}
      storeSizes={storeSizes}
      idAllocation={idAllocation}
      transactions={transactions}
      databases={databases}
      clusterMembers={clusterMembers}
      isEnterpriseEdition={enterprise}
      hasMultiDbSupport={hasMultiDbSupport}
    />
  ) : (
    <ErrorsView
      result={{ code: 'No connection', message: 'No connection available' }}
    />
  )

  return (
    <FrameBodyTemplate
      isCollapsed={isCollapsed}
      isFullscreen={isFullscreen}
      contents={content}
      statusBar={
        <StatusbarWrapper>
          <StyledStatusBar>
            {lastFetch && `Updated: ${new Date(lastFetch).toISOString()}`}
            {errorMessage && (
              <InlineError>
                <ExclamationTriangleIcon /> {errorMessage}
              </InlineError>
            )}
            <AutoRefreshSpan>
              <AutoRefreshToggle
                checked={autoRefresh}
                onChange={e => handleAutoRefreshChange(e.target.checked)}
              />
            </AutoRefreshSpan>
          </StyledStatusBar>
        </StatusbarWrapper>
      }
    />
  )
}

const FrameVersionPicker = (
  props: SysInfoFrameProps & { fallbackDb: string | null }
) => {
  const useLegacySysInfoFrame =
    props.isConnected && props.isEnterprise && !props.hasMultiDbSupport

  // Handle the case where sysinfo was run before we had loaded the db list
  // by rerunning when db has loaded
  useEffect(() => {
    if (!useLegacySysInfoFrame) {
      if (!props.frame.useDb && props.fallbackDb) {
        props.rerunWithDb({ id: props.frame.id, useDb: props.fallbackDb })
      }
    }
  }, [useLegacySysInfoFrame, props])

  if (useLegacySysInfoFrame) {
    return <LegacySysInfoFrame {...props} isOnCluster={props.isOnCluster} />
  } else {
    if (!props.frame.useDb) {
      return (
        <SpinnerContainer>
          <SpinnerIcon />
        </SpinnerContainer>
      )
    }
    return <SysInfoFrame {...props} />
  }
}

const mapStateToProps = (state: GlobalState) => ({
  hasMultiDbSupport: hasMultiDbSupport(state),
  isEnterprise: isEnterprise(state),
  isConnected: isConnected(state),
  databases: getDatabases(state),
  fallbackDb: getUseDb(state),
  isOnCluster: isOnCluster(state),
  namespacesEnabled: getMetricsNamespacesEnabled(state),
  metricsPrefix: getMetricsPrefix(state)
})
const mapDispatchToProps = (dispatch: Dispatch<Action>) => ({
  rerunWithDb: ({ useDb, id }: { useDb: string; id: string }) => {
    dispatch(
      executeCommand(':sysinfo', {
        id,
        useDb,
        isRerun: true,
        source: commandSources.rerunFrame
      })
    )
  }
})

export default withBus(
  connect(mapStateToProps, mapDispatchToProps)(FrameVersionPicker)
)
