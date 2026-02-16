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
import { AnyAction } from 'redux'
import { Epic, combineEpics } from 'redux-observable'
import { EMPTY, from } from 'rxjs'
import { catchError, filter, mergeMap, switchMap } from 'rxjs/operators'

import {
  CLEAR_QUERY_STATS,
  INITIALIZE_QUERY_STATS,
  RECORD_QUERY_EXECUTION,
  setRecentQueries,
  setTopQueries
} from './queryStatsDuck'
import { GlobalState } from 'shared/globalState'
import { QueryStatsStorageService } from 'shared/services/queryStatsStorage'

const TOP_QUERIES_LIMIT = 5
const RECENT_QUERIES_LIMIT = 3

/**
 * Epic that initializes the query stats storage service on app startup.
 * Opens IndexedDB and loads top + recent queries into Redux state.
 */
export const initializeQueryStatsEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === INITIALIZE_QUERY_STATS),
    switchMap(() => {
      const service = QueryStatsStorageService.getInstance()

      return from(service.initialize()).pipe(
        switchMap(() =>
          from(
            Promise.all([
              service.getTopQueries(TOP_QUERIES_LIMIT),
              service.getRecentQueries(RECENT_QUERIES_LIMIT)
            ])
          )
        ),
        mergeMap(([top, recent]) => [
          setTopQueries(top),
          setRecentQueries(recent)
        ]),
        catchError(error => {
          console.error(
            '[queryStatsEpics] Failed to initialize query stats:',
            error
          )
          return EMPTY
        })
      )
    })
  )

/**
 * Epic that records a query execution and refreshes both lists.
 * Uses switchMap so rapid commands cancel stale fetches.
 * Errors return EMPTY to never block command execution.
 */
export const recordQueryExecutionEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === RECORD_QUERY_EXECUTION),
    switchMap(action => {
      const { query } = action
      const service = QueryStatsStorageService.getInstance()

      return from(service.recordExecution(query)).pipe(
        switchMap(() =>
          from(
            Promise.all([
              service.getTopQueries(TOP_QUERIES_LIMIT),
              service.getRecentQueries(RECENT_QUERIES_LIMIT)
            ])
          )
        ),
        mergeMap(([top, recent]) => [
          setTopQueries(top),
          setRecentQueries(recent)
        ]),
        catchError(error => {
          console.error(
            '[queryStatsEpics] Failed to record query execution:',
            error
          )
          return EMPTY
        })
      )
    })
  )

/**
 * Epic that clears all query stats from IndexedDB and resets Redux state.
 */
export const clearQueryStatsEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === CLEAR_QUERY_STATS),
    switchMap(() => {
      const service = QueryStatsStorageService.getInstance()

      return from(service.clearAll()).pipe(
        mergeMap(() => [setTopQueries([]), setRecentQueries([])]),
        catchError(error => {
          console.error('[queryStatsEpics] Failed to clear query stats:', error)
          return EMPTY
        })
      )
    })
  )

export const queryStatsEpics = combineEpics(
  initializeQueryStatsEpic,
  recordQueryExecutionEpic,
  clearQueryStatsEpic
)

export default queryStatsEpics
