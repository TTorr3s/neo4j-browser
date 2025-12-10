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
import { Bus } from 'suber'

import {
  AutoRefreshSpan,
  AutoRefreshToggle,
  StatusbarWrapper,
  StyledStatusBar
} from '../../AutoRefresh/styled'
import { ErrorsView } from '../../CypherFrame/ErrorsView/ErrorsView'
import { SysInfoDisplay } from './SysInfoDisplay'
import * as legacyHelpers from './sysinfoHelpers'
import FrameBodyTemplate from 'browser/modules/Frame/FrameBodyTemplate'
import FrameError from 'browser/modules/Frame/FrameError'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import { CYPHER_REQUEST } from 'shared/modules/cypher/cypherDuck'
import { Frame } from 'shared/modules/frames/framesDuck'

const AUTO_REFRESH_INTERVAL = 20 // seconds

type LegacySysInfoFrameState = {
  lastFetch: null | number
  cc: any[]
  ha: any[]
  haInstances: any[]
  storeSizes: any[]
  idAllocation: any[]
  pageCache: any[]
  transactions: any[]
  error: string
  results: any
  success: any
}

type LegacySysInfoProps = {
  bus: Bus
  frame: Frame
  isConnected: boolean
  isFullscreen: boolean
  isCollapsed: boolean
  isOnCluster: boolean
}

export const LegacySysInfoFrame = ({
  bus,
  frame,
  isConnected,
  isFullscreen,
  isCollapsed,
  isOnCluster
}: LegacySysInfoProps): React.ReactElement => {
  const [lastFetch, setLastFetch] = useState<number | null>(null)
  const [cc, setCc] = useState<any[]>([])
  const [ha, setHa] = useState<any[]>([])
  const [haInstances, setHaInstances] = useState<any[]>([])
  const [storeSizes, setStoreSizes] = useState<any[]>([])
  const [idAllocation, setIdAllocation] = useState<any[]>([])
  const [pageCache, setPageCache] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [results, setResults] = useState<any>(false)
  const [success, setSuccess] = useState<any>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const timerRef = useRef<number | null>(null)

  // Create a setState-like function for the response handlers
  const updateState = useCallback(
    (newState: Partial<LegacySysInfoFrameState>) => {
      if (newState.lastFetch !== undefined) setLastFetch(newState.lastFetch)
      if (newState.cc !== undefined) setCc(newState.cc)
      if (newState.ha !== undefined) setHa(newState.ha)
      if (newState.haInstances !== undefined)
        setHaInstances(newState.haInstances)
      if (newState.storeSizes !== undefined) setStoreSizes(newState.storeSizes)
      if (newState.idAllocation !== undefined)
        setIdAllocation(newState.idAllocation)
      if (newState.pageCache !== undefined) setPageCache(newState.pageCache)
      if (newState.transactions !== undefined)
        setTransactions(newState.transactions)
      if (newState.error !== undefined) setError(newState.error)
      if (newState.results !== undefined) setResults(newState.results)
      if (newState.success !== undefined) setSuccess(newState.success)
    },
    []
  )

  const getSysInfo = useCallback((): void => {
    if (bus && isConnected) {
      setLastFetch(Date.now())
      bus.self(
        CYPHER_REQUEST,
        {
          query: legacyHelpers.sysinfoQuery(),
          queryType: NEO4J_BROWSER_USER_ACTION_QUERY
        },
        legacyHelpers.responseHandler(updateState)
      )
      if (isOnCluster) {
        bus.self(
          CYPHER_REQUEST,
          {
            query: 'CALL dbms.cluster.overview',
            queryType: NEO4J_BROWSER_USER_ACTION_QUERY
          },
          legacyHelpers.clusterResponseHandler(updateState)
        )
      }
    } else {
      setError('No connection available')
    }
  }, [bus, isConnected, isOnCluster, updateState])

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

  // Handle frame rerun
  useEffect(() => {
    if (frame && frame.isRerun) {
      getSysInfo()
    }
  }, [frame?.ts]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const content = isConnected ? (
    <SysInfoDisplay
      cc={cc}
      ha={ha}
      haInstances={haInstances}
      storeSizes={storeSizes}
      idAllocation={idAllocation}
      pageCache={pageCache}
      transactions={transactions}
      isOnCluster={isOnCluster}
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
          {error ? <FrameError message={error} /> : null}
          {success ? (
            <StyledStatusBar>
              {lastFetch && `Updated: ${new Date(lastFetch).toISOString()}`}
              {success}
              <AutoRefreshSpan>
                <AutoRefreshToggle
                  checked={autoRefresh}
                  onChange={(e: any) =>
                    handleAutoRefreshChange(e.target.checked)
                  }
                />
              </AutoRefreshSpan>
            </StyledStatusBar>
          ) : null}
        </StatusbarWrapper>
      }
    />
  )
}

export default LegacySysInfoFrame
