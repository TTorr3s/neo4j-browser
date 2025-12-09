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

import {
  autoCommitTxCommand,
  executeSingleCommand,
  executeSystemCommand,
  handleSingleCommandEpic
} from './commandsDuck'
import packageJson from 'project-root/package.json'
import bolt from 'services/bolt/bolt'

jest.mock('shared/services/bolt/boltWorker')

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
    hasMultiDbSupport: jest.fn(() => Promise.resolve(true)),
    useDb: jest.fn()
  }
}))

// Helper to create a test setup with store and bus
const createTestSetup = () => {
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

  const store = mockStore({
    settings: {
      maxHistory: 20
    },
    history: [],
    connections: {},
    params: {},
    grass: {},
    meta: {},
    requests: {
      rqid: {
        status: 'pending'
      }
    }
  })

  // Populate epic dependencies with store methods
  epicDependencies.dispatch = store.dispatch
  epicDependencies.getState = store.getState

  // Run the epic after store creation (redux-observable 1.x API)
  epicMiddleware.run(handleSingleCommandEpic as any)

  return { store, bus }
}

// Helper to wait for actions
const waitForAction = (
  store: MockStoreEnhanced<unknown, unknown>,
  bus: ReturnType<typeof createBus>,
  actionType: string,
  timeout = 2000
): Promise<any[]> => {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      resolve(store.getActions())
    }, timeout)

    bus.take(actionType, () => {
      clearTimeout(timer)
      // Give a bit of time for any follow-up actions
      setTimeout(() => resolve(store.getActions()), 50)
    })
  })
}

describe('tx metadata with cypher', () => {
  let store: MockStoreEnhanced<unknown, unknown>
  let bus: ReturnType<typeof createBus>

  beforeAll(() => {
    const setup = createTestSetup()
    store = setup.store
    bus = setup.bus
  })

  afterEach(() => {
    store.clearActions()
    bus.reset()
    const boltMock = bolt as jest.Mocked<typeof bolt>
    boltMock.routedWriteTransaction.mockClear()
  })

  it('adds tx metadata for user entered cypher queries', async () => {
    // Given
    const action = executeSingleCommand('RETURN 1', {
      id: 'id',
      requestId: 'rqid'
    })

    store.dispatch(action)
    await waitForAction(store, bus, 'NOOP')

    expect(bolt.routedWriteTransaction).toHaveBeenCalledTimes(1)
    expect(bolt.routedWriteTransaction).toHaveBeenCalledWith(
      'RETURN 1',
      {},
      expect.objectContaining({
        txMetadata: {
          app: `neo4j-browser_v${packageJson.version}`,
          type: 'user-direct'
        }
      })
    )
  })

  it('adds tx metadata for system cypher queries', async () => {
    // Given
    const action = executeSystemCommand('RETURN 1')

    store.dispatch(action)
    await waitForAction(store, bus, 'NOOP')

    expect(bolt.routedWriteTransaction).toHaveBeenCalledTimes(1)
    expect(bolt.routedWriteTransaction).toHaveBeenCalledWith(
      'RETURN 1',
      {},
      expect.objectContaining({
        txMetadata: {
          app: `neo4j-browser_v${packageJson.version}`,
          type: 'system'
        }
      })
    )
  })
})

describe('Implicit vs explicit transactions', () => {
  let store: MockStoreEnhanced<unknown, unknown>
  let bus: ReturnType<typeof createBus>

  beforeAll(() => {
    const setup = createTestSetup()
    store = setup.store
    bus = setup.bus
  })

  afterEach(() => {
    store.clearActions()
    bus.reset()
    const boltMock = bolt as jest.Mocked<typeof bolt>
    boltMock.routedWriteTransaction.mockClear()
  })

  test(`it sends the autoCommit flag = true to tx functions when using the :${autoCommitTxCommand} command`, async () => {
    // Given
    const action = executeSingleCommand(`:${autoCommitTxCommand} RETURN 1`)

    store.dispatch(action)
    await waitForAction(store, bus, 'NOOP')

    expect(bolt.routedWriteTransaction).toHaveBeenCalledTimes(1)
    expect(bolt.routedWriteTransaction).toHaveBeenCalledWith(
      ' RETURN 1',
      {},
      expect.objectContaining({
        autoCommit: true
      })
    )
  })

  test('Sets autocommit flag = true even with leading comments in cypher', async () => {
    // Given
    const action = executeSingleCommand(
      `// comment
/*
multiline comment
*/
// comment

// comment
/*:auto*/:${autoCommitTxCommand} RETURN ":auto"`
    )

    store.dispatch(action)
    await waitForAction(store, bus, 'NOOP')

    expect(bolt.routedWriteTransaction).toHaveBeenCalledTimes(1)
    expect(bolt.routedWriteTransaction).toHaveBeenCalledWith(
      `// comment
/*
multiline comment
*/
// comment

// comment
/*:auto*/ RETURN ":auto"`,
      {},
      expect.objectContaining({
        autoCommit: true
      })
    )
  })

  test('it sends the autoCommit flag = false to tx functions on regular cypher', async () => {
    // Given
    const action = executeSingleCommand('RETURN 1')

    store.dispatch(action)
    await waitForAction(store, bus, 'NOOP')

    expect(bolt.routedWriteTransaction).toHaveBeenCalledTimes(1)
    expect(bolt.routedWriteTransaction).toHaveBeenCalledWith(
      'RETURN 1',
      {},
      expect.objectContaining({
        autoCommit: false
      })
    )
  })
})
