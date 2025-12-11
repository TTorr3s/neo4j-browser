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
import { combineEpics, Epic } from 'redux-observable'
import { EMPTY, from, of } from 'rxjs'
import {
  filter,
  switchMap,
  catchError,
  ignoreElements,
  tap,
  mergeMap
} from 'rxjs/operators'

import {
  INITIALIZE_HISTORY,
  ADD_HISTORY_ASYNC,
  PREFETCH_HISTORY,
  CLEAR,
  setStorageMode,
  setTotalCount,
  setCache,
  setError,
  setLoading,
  getHistoryCache
} from './historyDuck'
import {
  HistoryStorageService,
  HistoryEntry
} from 'shared/services/historyStorage'
import { getItem, removeItem } from 'services/localstorage'
import { GlobalState } from 'shared/globalState'

const LEGACY_LOCALSTORAGE_KEY = 'history'

/**
 * Epic that initializes the history storage service on app startup.
 *
 * - Initializes HistoryStorageService (IndexedDB with localStorage fallback)
 * - Checks for existing localStorage history and migrates if in IndexedDB mode
 * - Populates Redux state with initial cache entries
 */
export const initializeHistoryEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === INITIALIZE_HISTORY),
    switchMap(() => {
      const service = HistoryStorageService.getInstance()

      return from(service.initialize()).pipe(
        switchMap(() => {
          const storageMode = service.getStorageMode()

          // Check for legacy localStorage history to migrate
          const legacyHistory = getItem(LEGACY_LOCALSTORAGE_KEY) as
            | string[]
            | undefined

          if (
            storageMode === 'indexeddb' &&
            legacyHistory &&
            legacyHistory.length > 0
          ) {
            // Migrate from localStorage to IndexedDB
            return from(service.migrateFromLocalStorage(legacyHistory)).pipe(
              switchMap(() => {
                // Clear localStorage after successful migration to prevent re-migration
                removeItem(LEGACY_LOCALSTORAGE_KEY)
                return from(service.getLatestEntries(service.getTotalCount()))
              }),
              mergeMap((entries: HistoryEntry[]) => [
                setStorageMode(storageMode),
                setTotalCount(service.getTotalCount()),
                setCache(entries),
                setLoading(false)
              ]),
              catchError(error =>
                of(
                  setError(
                    error instanceof Error ? error.message : 'Migration failed'
                  ),
                  setLoading(false)
                )
              )
            )
          }

          // No migration needed, just load initial entries
          return from(service.getLatestEntries(100)).pipe(
            mergeMap((entries: HistoryEntry[]) => [
              setStorageMode(storageMode),
              setTotalCount(service.getTotalCount()),
              setCache(entries),
              setLoading(false)
            ]),
            catchError(error =>
              of(
                setError(
                  error instanceof Error
                    ? error.message
                    : 'Failed to load history'
                ),
                setLoading(false)
              )
            )
          )
        }),
        catchError(error =>
          of(
            setError(
              error instanceof Error
                ? error.message
                : 'Failed to initialize history'
            ),
            setLoading(false)
          )
        )
      )
    })
  )

/**
 * Epic that handles adding a new history entry asynchronously.
 *
 * - Skips if query is same as most recent entry (no duplicates)
 * - Persists entry to storage via HistoryStorageService
 * - Updates Redux cache with new entry
 */
export const addHistoryAsyncEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$
) =>
  action$.pipe(
    filter(action => action.type === ADD_HISTORY_ASYNC),
    switchMap(action => {
      const { query } = action
      const currentCache = getHistoryCache(state$.value)

      // Skip if query is same as most recent entry
      if (currentCache.length > 0 && currentCache[0].query === query) {
        return EMPTY
      }

      const service = HistoryStorageService.getInstance()

      return from(service.addEntry(query)).pipe(
        mergeMap((newId: number) => {
          if (newId === -1) {
            // Add failed, but don't dispatch error - just skip
            return EMPTY
          }

          // Create new entry for cache
          const newEntry: HistoryEntry = {
            id: newId,
            query,
            timestamp: Date.now()
          }

          // Update cache with new entry at the beginning
          const updatedCache = [
            newEntry,
            ...currentCache.slice(0, 99) // Keep cache size at 100 max
          ]

          return of(
            setCache(updatedCache),
            setTotalCount(service.getTotalCount())
          )
        }),
        catchError(error => {
          console.error('[historyEpics] Failed to add history entry:', error)
          // Don't dispatch error to state - adding history should be non-blocking
          return EMPTY
        })
      )
    })
  )

/**
 * Epic that handles prefetching history entries for smooth navigation.
 *
 * - Triggers background prefetch in HistoryStorageService
 * - Fire-and-forget pattern - no state updates needed
 */
export const prefetchHistoryEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === PREFETCH_HISTORY),
    tap(action => {
      const { index, direction } = action
      const service = HistoryStorageService.getInstance()

      // Fire and forget - prefetch runs in background
      service.prefetch(index, direction).catch(error => {
        console.error('[historyEpics] Prefetch failed:', error)
      })
    }),
    ignoreElements()
  )

/**
 * Epic that clears all history entries when CLEAR action is dispatched.
 *
 * - Clears storage via HistoryStorageService
 * - Redux state is already cleared by reducer
 */
export const clearHistoryAsyncEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    filter(action => action.type === CLEAR),
    switchMap(() => {
      const service = HistoryStorageService.getInstance()

      return from(service.clear()).pipe(
        mergeMap(() => [setCache([]), setTotalCount(0), setError(null)]),
        catchError(error => {
          console.error('[historyEpics] Failed to clear history:', error)
          // Still return empty state even if storage clear fails
          return of(setCache([]), setTotalCount(0))
        })
      )
    })
  )

export const historyEpics = combineEpics(
  initializeHistoryEpic,
  addHistoryAsyncEpic,
  prefetchHistoryEpic,
  clearHistoryAsyncEpic
)

export default historyEpics
