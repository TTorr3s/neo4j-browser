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

import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  HistoryProvider,
  HistoryStorageService
} from 'shared/services/historyStorage'
import {
  getHistoryTotalCount,
  prefetchHistory
} from 'shared/modules/history/historyDuck'

/**
 * Custom hook that provides a HistoryProvider for CypherEditor history navigation.
 *
 * This hook bridges the gap between the CypherEditor component (in neo4j-arc)
 * and the history storage system, providing an abstraction that allows
 * CypherEditor to access history without directly importing from shared/services.
 *
 * The provider uses Redux for total count (for reactivity) and HistoryStorageService
 * for actual data fetching operations.
 *
 * @returns A memoized HistoryProvider object
 *
 * @example
 * ```tsx
 * const historyProvider = useHistoryProvider()
 *
 * // Get entry asynchronously
 * const query = await historyProvider.getEntry(0)
 *
 * // Get entry from cache (synchronous)
 * const cachedQuery = historyProvider.getEntrySync(0)
 *
 * // Check total entries
 * const count = historyProvider.getTotalCount()
 *
 * // Prefetch for navigation
 * historyProvider.prefetch(5, 'back')
 * ```
 */
export function useHistoryProvider(): HistoryProvider {
  const dispatch = useDispatch()
  const totalCount = useSelector(getHistoryTotalCount)
  const provider = useMemo<HistoryProvider>(
    () => ({
      getEntry: async (index: number): Promise<string | null> => {
        const service = HistoryStorageService.getInstance()
        return service.getEntryByIndex(index)
      },

      getEntrySync: (index: number): string | undefined => {
        const service = HistoryStorageService.getInstance()
        return service.getEntryByIndexSync(index)
      },

      getTotalCount: (): number => {
        // Use Redux state if available, fallback to service
        if (totalCount > 0) {
          return totalCount
        }
        const service = HistoryStorageService.getInstance()
        return service.getTotalCount()
      },

      prefetch: (index: number, direction: 'back' | 'forward'): void => {
        dispatch(prefetchHistory(index, direction))
      },

      isInCache: (index: number): boolean => {
        const service = HistoryStorageService.getInstance()
        return service.isInCache(index)
      }
    }),
    [dispatch, totalCount]
  )

  return provider
}

export default useHistoryProvider
