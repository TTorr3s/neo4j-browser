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
import { GlobalState } from 'shared/globalState'
import { QueryStat, QueryStatsState } from 'shared/services/queryStatsStorage'

// Module name
export const NAME = 'queryStats'

// Action types
export const INITIALIZE_QUERY_STATS = 'queryStats/INITIALIZE'
export const RECORD_QUERY_EXECUTION = 'queryStats/RECORD_EXECUTION'
export const SET_TOP_QUERIES = 'queryStats/SET_TOP_QUERIES'
export const SET_RECENT_QUERIES = 'queryStats/SET_RECENT_QUERIES'
export const CLEAR_QUERY_STATS = 'queryStats/CLEAR'
export const SET_QUERY_STATS_ERROR = 'queryStats/SET_ERROR'

// Initial state
export const initialState: QueryStatsState = {
  topQueries: [],
  recentQueries: [],
  isInitialized: false,
  error: null
}

// Selectors
export const getTopQueries = (state: GlobalState): QueryStat[] =>
  state[NAME]?.topQueries ?? []

export const getRecentQueries = (state: GlobalState): QueryStat[] =>
  state[NAME]?.recentQueries ?? []

export const getIsQueryStatsInitialized = (state: GlobalState): boolean =>
  state[NAME]?.isInitialized ?? false

// Action interfaces
interface InitializeQueryStatsAction {
  type: typeof INITIALIZE_QUERY_STATS
}

interface RecordQueryExecutionAction {
  type: typeof RECORD_QUERY_EXECUTION
  query: string
}

interface SetTopQueriesAction {
  type: typeof SET_TOP_QUERIES
  queries: QueryStat[]
}

interface SetRecentQueriesAction {
  type: typeof SET_RECENT_QUERIES
  queries: QueryStat[]
}

interface ClearQueryStatsAction {
  type: typeof CLEAR_QUERY_STATS
}

interface SetQueryStatsErrorAction {
  type: typeof SET_QUERY_STATS_ERROR
  error: string | null
}

type QueryStatsAction =
  | InitializeQueryStatsAction
  | RecordQueryExecutionAction
  | SetTopQueriesAction
  | SetRecentQueriesAction
  | ClearQueryStatsAction
  | SetQueryStatsErrorAction

// Reducer
export default function queryStatsReducer(
  state: QueryStatsState = initialState,
  action: QueryStatsAction
): QueryStatsState {
  switch (action.type) {
    case SET_TOP_QUERIES:
      return {
        ...state,
        topQueries: (action as SetTopQueriesAction).queries,
        isInitialized: true
      }

    case SET_RECENT_QUERIES:
      return {
        ...state,
        recentQueries: (action as SetRecentQueriesAction).queries,
        isInitialized: true
      }

    case SET_QUERY_STATS_ERROR:
      return {
        ...state,
        error: (action as SetQueryStatsErrorAction).error
      }

    // These actions are handled by epics, not the reducer
    case INITIALIZE_QUERY_STATS:
    case RECORD_QUERY_EXECUTION:
    case CLEAR_QUERY_STATS:
      return state

    default:
      return state
  }
}

// Action creators
export const initializeQueryStats = (): InitializeQueryStatsAction => ({
  type: INITIALIZE_QUERY_STATS
})

export const recordQueryExecution = (
  query: string
): RecordQueryExecutionAction => ({
  type: RECORD_QUERY_EXECUTION,
  query
})

export const setTopQueries = (queries: QueryStat[]): SetTopQueriesAction => ({
  type: SET_TOP_QUERIES,
  queries
})

export const setRecentQueries = (
  queries: QueryStat[]
): SetRecentQueriesAction => ({
  type: SET_RECENT_QUERIES,
  queries
})

export const clearQueryStats = (): ClearQueryStatsAction => ({
  type: CLEAR_QUERY_STATS
})

export const setQueryStatsError = (
  error: string | null
): SetQueryStatsErrorAction => ({
  type: SET_QUERY_STATS_ERROR,
  error
})
