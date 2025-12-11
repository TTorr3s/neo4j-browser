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
import { USER_CLEAR } from '../app/appDuck'
import { GlobalState } from 'shared/globalState'
import {
  HistoryState,
  HistoryEntry,
  StorageMode
} from 'shared/services/historyStorage'

// Module name
export const NAME = 'history'

// Action types
export const ADD = 'history/ADD'
export const CLEAR = 'history/CLEAR'
export const SET_CACHE = 'history/SET_CACHE'
export const SET_STORAGE_MODE = 'history/SET_STORAGE_MODE'
export const SET_LOADING = 'history/SET_LOADING'
export const SET_TOTAL_COUNT = 'history/SET_TOTAL_COUNT'
export const SET_ERROR = 'history/SET_ERROR'
export const INITIALIZE_HISTORY = 'history/INITIALIZE'
export const ADD_HISTORY_ASYNC = 'history/ADD_ASYNC'
export const PREFETCH_HISTORY = 'history/PREFETCH'

// Initial state
export const initialState: HistoryState = {
  cache: [],
  totalCount: 0,
  storageMode: 'indexeddb',
  isLoading: false,
  error: null
}

// Selectors
/** @deprecated Use getHistoryCache for full entry data */
export const getHistory = (state: GlobalState): string[] =>
  state[NAME]?.cache?.map((entry: HistoryEntry) => entry.query) ?? []

export const getHistoryState = (state: GlobalState): HistoryState =>
  state[NAME] ?? initialState

export const getHistoryCache = (state: GlobalState): HistoryEntry[] =>
  state[NAME]?.cache ?? []

export const getHistoryTotalCount = (state: GlobalState): number =>
  state[NAME]?.totalCount ?? 0

export const getHistoryStorageMode = (state: GlobalState): StorageMode =>
  state[NAME]?.storageMode ?? 'indexeddb'

export const getHistoryIsLoading = (state: GlobalState): boolean =>
  state[NAME]?.isLoading ?? false

export const getHistoryError = (state: GlobalState): string | null =>
  state[NAME]?.error ?? null

// Helper function for legacy ADD action (synchronous cache update)
function addHistoryHelper(
  cache: HistoryEntry[],
  query: string,
  maxHistory: number
): HistoryEntry[] {
  // If it's the same as the last entry, don't add it
  if (cache.length > 0 && cache[0].query === query) {
    return cache
  }

  // Create a new entry with a temporary id (will be updated by storage)
  const newEntry: HistoryEntry = {
    id: Date.now(), // Temporary id for cache
    query,
    timestamp: Date.now()
  }

  const newCache = [newEntry, ...cache]
  return newCache.slice(0, maxHistory)
}

// Action interfaces
interface AddAction {
  type: typeof ADD
  state: string
  maxHistory: number
}

interface ClearAction {
  type: typeof CLEAR
}

interface UserClearAction {
  type: typeof USER_CLEAR
}

interface SetCacheAction {
  type: typeof SET_CACHE
  entries: HistoryEntry[]
}

interface SetStorageModeAction {
  type: typeof SET_STORAGE_MODE
  mode: StorageMode
}

interface SetLoadingAction {
  type: typeof SET_LOADING
  isLoading: boolean
}

interface SetTotalCountAction {
  type: typeof SET_TOTAL_COUNT
  count: number
}

interface SetErrorAction {
  type: typeof SET_ERROR
  error: string | null
}

interface InitializeHistoryAction {
  type: typeof INITIALIZE_HISTORY
}

interface AddHistoryAsyncAction {
  type: typeof ADD_HISTORY_ASYNC
  query: string
  maxHistory: number
}

interface PrefetchHistoryAction {
  type: typeof PREFETCH_HISTORY
  index: number
  direction: 'back' | 'forward'
}

type HistoryAction =
  | AddAction
  | ClearAction
  | UserClearAction
  | SetCacheAction
  | SetStorageModeAction
  | SetLoadingAction
  | SetTotalCountAction
  | SetErrorAction
  | InitializeHistoryAction
  | AddHistoryAsyncAction
  | PrefetchHistoryAction

// Reducer
export default function historyReducer(
  state: HistoryState = initialState,
  action: HistoryAction
): HistoryState {
  switch (action.type) {
    case ADD:
      // Legacy synchronous add - updates cache directly
      return {
        ...state,
        cache: addHistoryHelper(
          state.cache,
          (action as AddAction).state,
          (action as AddAction).maxHistory
        ),
        totalCount: state.totalCount + 1
      }

    case CLEAR:
    case USER_CLEAR:
      return {
        ...initialState,
        storageMode: state.storageMode
      }

    case SET_CACHE:
      return {
        ...state,
        cache: (action as SetCacheAction).entries
      }

    case SET_STORAGE_MODE:
      return {
        ...state,
        storageMode: (action as SetStorageModeAction).mode
      }

    case SET_LOADING:
      return {
        ...state,
        isLoading: (action as SetLoadingAction).isLoading
      }

    case SET_TOTAL_COUNT:
      return {
        ...state,
        totalCount: (action as SetTotalCountAction).count
      }

    case SET_ERROR:
      return {
        ...state,
        error: (action as SetErrorAction).error,
        isLoading: false
      }

    // These actions are handled by epics, not the reducer
    case INITIALIZE_HISTORY:
    case ADD_HISTORY_ASYNC:
    case PREFETCH_HISTORY:
      return state

    default:
      return state
  }
}

// Action creators

/** @deprecated Use addHistoryAsync for async storage support */
export const addHistory = (state: string, maxHistory: number): AddAction => ({
  type: ADD,
  state,
  maxHistory
})

export const clearHistory = (): ClearAction => ({
  type: CLEAR
})

export const setCache = (entries: HistoryEntry[]): SetCacheAction => ({
  type: SET_CACHE,
  entries
})

export const setStorageMode = (mode: StorageMode): SetStorageModeAction => ({
  type: SET_STORAGE_MODE,
  mode
})

export const setLoading = (isLoading: boolean): SetLoadingAction => ({
  type: SET_LOADING,
  isLoading
})

export const setTotalCount = (count: number): SetTotalCountAction => ({
  type: SET_TOTAL_COUNT,
  count
})

export const setError = (error: string | null): SetErrorAction => ({
  type: SET_ERROR,
  error
})

export const initializeHistory = (): InitializeHistoryAction => ({
  type: INITIALIZE_HISTORY
})

export const addHistoryAsync = (
  query: string,
  maxHistory: number
): AddHistoryAsyncAction => ({
  type: ADD_HISTORY_ASYNC,
  query,
  maxHistory
})

export const prefetchHistory = (
  index: number,
  direction: 'back' | 'forward'
): PrefetchHistoryAction => ({
  type: PREFETCH_HISTORY,
  index,
  direction
})
