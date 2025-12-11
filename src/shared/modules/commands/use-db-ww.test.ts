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
import configureMockStore, { MockStoreEnhanced } from 'redux-mock-store'
import { createEpicMiddleware } from 'redux-observable'
import { createBus, createReduxMiddleware } from 'suber'

import { executeSingleCommand, handleSingleCommandEpic } from './commandsDuck'
import bolt from 'services/bolt/bolt'
import { flushPromises } from 'services/utils'

jest.mock('shared/modules/params/paramsDuck', () => {
  const orig = jest.requireActual('shared/modules/params/paramsDuck')
  return {
    ...orig,
    getParams: () => ({})
  }
})

jest.mock('shared/modules/settings/settingsDuck', () => {
  const orig = jest.requireActual('shared/modules/settings/settingsDuck')
  return {
    ...orig,
    shouldUseReadTransactions: () => false
  }
})

jest.mock('shared/modules/dbMeta/dbMetaDuck', () => ({
  getRawVersion: () => '4.0.0',
  getActiveDbName: jest.fn(() => 'neo4j'),
  getAvailableSettings: jest.fn(() => []),
  getClusterRoleForCurrentDb: jest.fn(() => null),
  getDatabases: jest.fn(() => []),
  getSemanticVersion: jest.fn(() => ({ major: 4, minor: 0, patch: 0 })),
  isEnterprise: jest.fn(() => true),
  getUseDb: jest.fn(() => null),
  shouldRetainConnectionCredentials: jest.fn(() => true),
  shouldUseCypherThread: jest.fn(() => true),
  CLEAR_META: 'meta/CLEAR',
  UPDATE_META: 'meta/UPDATE_META',
  PARSE_META: 'meta/PARSE_META',
  DB_META_DONE: 'meta/DB_META_DONE',
  LABELS_LOADED: 'meta/LABELS_LOADED',
  SERVER_VERSION_READ: 'meta/SERVER_VERSION_READ'
}))

const bus = createBus()

// Epic dependencies for redux-observable 2.x
const epicDependencies: {
  dispatch: (action: any) => void
  getState: () => any
} = {
  dispatch: () => {},
  getState: () => ({})
}

const epicMiddleware = createEpicMiddleware({
  dependencies: epicDependencies
})
const mockStore = configureMockStore([
  epicMiddleware,
  createReduxMiddleware(bus)
])

describe('Specified target database, using mocked bolt', () => {
  let store: MockStoreEnhanced<unknown, unknown>
  const boltMock = bolt as jest.Mocked<typeof bolt>

  beforeAll(() => {
    // Configure store with useDb in connections state
    store = mockStore({
      settings: { maxHistory: 20 },
      history: [],
      connections: {
        useDb: 'autoDb'
      },
      params: {},
      grass: {},
      meta: {},
      requests: {}
    })

    // Populate epic dependencies with store methods
    epicDependencies.dispatch = store.dispatch
    epicDependencies.getState = store.getState

    // Run the epic after store creation (redux-observable 2.x API)
    epicMiddleware.run(handleSingleCommandEpic as any)
  })

  beforeEach(() => {
    store.clearActions()
    bus.reset()
    boltMock.routedWriteTransaction.mockClear()
  })

  test('it passes undefined useDb when no specific db is specified with the action', async () => {
    // Given - action without useDb
    const action = executeSingleCommand(`RETURN 1`)

    // When
    store.dispatch(action)
    await flushPromises()

    // Then - useDb from action is undefined (the real bolt code would use its internal _useDb)
    expect(boltMock.routedWriteTransaction).toHaveBeenCalledTimes(1)
    expect(boltMock.routedWriteTransaction).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({
        useDb: undefined
      })
    )
  })

  test('it uses the specified db if passed in with the action', async () => {
    // Given - action with explicit useDb
    const action = executeSingleCommand(`RETURN 1`, { useDb: 'manualDb' })

    // When
    store.dispatch(action)
    await flushPromises()

    // Then - useDb from action is passed through
    expect(boltMock.routedWriteTransaction).toHaveBeenCalledTimes(1)
    expect(boltMock.routedWriteTransaction).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({
        useDb: 'manualDb'
      })
    )
  })
})
