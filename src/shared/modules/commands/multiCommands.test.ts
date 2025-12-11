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

import * as commands from './commandsDuck'
import bolt from 'services/bolt/bolt'
import { add as addFrame } from 'shared/modules/frames/framesDuck'
import { addHistoryAsync } from 'shared/modules/history/historyDuck'

// Mock bolt module with __esModule to handle default export correctly
jest.mock('services/bolt/bolt', () => ({
  __esModule: true,
  default: {
    routedWriteTransaction: jest.fn(() => [
      'id',
      Promise.resolve({ records: [] })
    ]),
    routedReadTransaction: jest.fn(() => Promise.resolve({ records: [] })),
    directTransaction: jest.fn(() => Promise.resolve({ records: [] })),
    closeConnection: jest.fn(),
    openConnection: jest.fn(() => Promise.resolve()),
    directConnect: jest.fn(() => Promise.resolve()),
    hasMultiDbSupport: jest.fn(() => Promise.resolve(true)),
    useDb: jest.fn()
  }
}))

const bus = createBus()

// Epic dependencies for redux-observable 1.x
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

// Helper to wait for actions with timeout
const waitForActions = (
  store: MockStoreEnhanced<unknown, unknown>,
  timeout = 200
): Promise<any[]> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(store.getActions()), timeout)
  })
}

describe('handleCommandEpic', () => {
  let store: MockStoreEnhanced<unknown, unknown>
  const maxHistory = 20

  beforeAll(() => {
    store = mockStore({
      settings: {
        maxHistory,
        enableMultiStatementMode: true
      },
      history: [':xxx'],
      connections: {},
      params: {},
      grass: {
        node: {
          color: '#000'
        }
      }
    })
    // Populate epic dependencies with store methods
    epicDependencies.dispatch = store.dispatch
    epicDependencies.getState = store.getState
    // Run the epic after store creation (redux-observable 1.x API)
    epicMiddleware.run(commands.handleCommandEpic as any)
  })

  beforeEach(() => {
    // Reset bolt mocks to default behavior
    const boltMock = bolt as jest.Mocked<typeof bolt>
    boltMock.routedWriteTransaction.mockImplementation(() => [
      'id',
      Promise.resolve({ records: [] })
    ])
  })

  afterEach(() => {
    store.clearActions()
    bus.reset()
  })

  test('listens on COMMAND_QUEUED for cypher a single command and passes on to SINGLE:COMMAND_QUEUED', done => {
    // Given
    const cmd = 'RETURN 1'
    const id = 2
    const requestId = 'xxx'
    const action = commands.executeCommand(cmd, { id, requestId })
    bus.take(commands.SINGLE_COMMAND_QUEUED, () => {
      // Then
      expect(store.getActions()).toEqual([
        action,
        commands.clearErrorMessage(),
        addHistoryAsync(action.cmd, maxHistory),
        commands.executeSingleCommand(cmd, { id, requestId })
      ])
      done()
    })
    // When
    store.dispatch(action)

    // Then
    // See snoopOnActions above
  })

  test('listens on COMMAND_QUEUED for cypher a multi commands', async () => {
    // Given
    const cmd = ':param x => 1; RETURN $x'
    const id = 2
    const requestId = 'xxx'
    const parentId = 'yyy'
    const action = commands.executeCommand(cmd, {
      id,
      requestId,
      parentId
    })

    // When
    store.dispatch(action)
    const actions = await waitForActions(store)

    // Then
    expect(actions).toContainEqual(action)
    expect(actions).toContainEqual(addHistoryAsync(action.cmd, maxHistory))
    expect(actions).toContainEqual(
      addFrame({
        type: 'cypher-script',
        id: parentId,
        isRerun: false,
        cmd: action.cmd
      } as any)
    )
    // Non deterministic id:s in the commands, so skip
  })
})
