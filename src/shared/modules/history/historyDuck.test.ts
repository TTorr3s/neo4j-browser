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
import reducer, * as actions from './historyDuck'
import { HistoryState } from 'shared/services/historyStorage'

// Helper to extract just query strings from cache for easier testing
const getQueries = (state: HistoryState): string[] =>
  state.cache.map(entry => entry.query)

// Helper to create a HistoryState with a cache of query strings
const createState = (queries: string[]): HistoryState => ({
  cache: queries.map((query, index) => ({
    id: Date.now() - index,
    query,
    timestamp: Date.now() - index
  })),
  totalCount: queries.length,
  storageMode: 'indexeddb',
  isLoading: false,
  error: null
})

describe('history reducer', () => {
  test('handles history.ADD action', () => {
    const helpAction = actions.addHistory(':help', 20)
    const nextState = reducer(undefined, helpAction)
    expect(getQueries(nextState)).toEqual([':help'])
    expect(nextState.totalCount).toBe(1)

    // One more time
    const historyAction = actions.addHistory(':history', 20)
    const nextnextState = reducer(nextState, historyAction)
    expect(getQueries(nextnextState)).toEqual([':history', ':help'])
    expect(nextnextState.totalCount).toBe(2)
  })

  test('history.ADD does not repeat two entries in a row', () => {
    // Given
    const helpAction = actions.addHistory(':help', 20)
    const historyAction = actions.addHistory(':history', 20)
    const initialState = createState([':help'])

    // When
    const nextState = reducer(initialState, helpAction)

    // Then - should not add duplicate
    expect(getQueries(nextState)).toEqual([':help'])

    // When
    const nextState1 = reducer(nextState, historyAction)

    // Then
    expect(getQueries(nextState1)).toEqual([':history', ':help'])
  })

  test('respects maxHistory limit', () => {
    const initialState = createState([':help', ':help2', ':help3'])

    const helpAction = actions.addHistory(':history', 3)
    const nextState = reducer(initialState, helpAction)
    expect(getQueries(nextState)).toEqual([':history', ':help', ':help2'])
    expect(nextState.totalCount).toBe(4) // totalCount increases
  })

  test('handles history.CLEAR action', () => {
    // Given
    const initialState = createState([':emily'])
    const anAction = actions.addHistory(':elliot', 3)
    const state = reducer(initialState, anAction)

    // When
    const nextState = reducer(state, actions.clearHistory())

    // Then
    expect(getQueries(nextState)).toEqual([])
    expect(nextState.totalCount).toBe(0)
  })

  test('handles SET_CACHE action', () => {
    const initialState = actions.initialState
    const entries = [
      { id: 1, query: ':help', timestamp: Date.now() },
      { id: 2, query: ':history', timestamp: Date.now() }
    ]

    const nextState = reducer(initialState, actions.setCache(entries))
    expect(nextState.cache).toEqual(entries)
  })

  test('handles SET_STORAGE_MODE action', () => {
    const initialState = actions.initialState
    const nextState = reducer(
      initialState,
      actions.setStorageMode('localstorage')
    )
    expect(nextState.storageMode).toBe('localstorage')
  })

  test('handles SET_TOTAL_COUNT action', () => {
    const initialState = actions.initialState
    const nextState = reducer(initialState, actions.setTotalCount(100))
    expect(nextState.totalCount).toBe(100)
  })

  test('handles SET_LOADING action', () => {
    const initialState = actions.initialState
    const nextState = reducer(initialState, actions.setLoading(true))
    expect(nextState.isLoading).toBe(true)
  })

  test('handles SET_ERROR action', () => {
    const initialState = actions.initialState
    const nextState = reducer(
      initialState,
      actions.setError('Something went wrong')
    )
    expect(nextState.error).toBe('Something went wrong')
    expect(nextState.isLoading).toBe(false)
  })

  test('getHistory selector returns string array for backward compatibility', () => {
    const state = createState([':help', ':history'])
    const globalState = { history: state } as any
    expect(actions.getHistory(globalState)).toEqual([':help', ':history'])
  })
})
