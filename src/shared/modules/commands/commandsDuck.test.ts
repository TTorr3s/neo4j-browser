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
import { QueryResult } from 'neo4j-driver'
import configureMockStore, { MockStoreEnhanced } from 'redux-mock-store'
import { createEpicMiddleware } from 'redux-observable'
import { createBus, createReduxMiddleware } from 'suber'
import { v4 as uuid } from 'uuid'

import { BoltConnectionError } from '../../services/exceptions'
import { fetchMetaData } from '../dbMeta/dbMetaDuck'
import * as commands from './commandsDuck'
import bolt from 'services/bolt/bolt'
import { disconnectAction } from 'shared/modules/connections/connectionsDuck'
import {
  replace as replaceParams,
  update as updateParams
} from 'shared/modules/params/paramsDuck'
import { send } from 'shared/modules/requests/requestsDuck'
import {
  replace as replaceSettings,
  update as updateSettings
} from 'shared/modules/settings/settingsDuck'

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

// Helper to wait for actions
const waitForAction = (
  store: MockStoreEnhanced<unknown, unknown>,
  actionType: string,
  timeout = 2000
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
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

describe('commandsDuck', () => {
  let store: MockStoreEnhanced<unknown, unknown>
  const maxHistory = 20

  beforeAll(() => {
    store = mockStore({
      settings: {
        maxHistory
      },
      history: [':xxx'],
      connections: {},
      params: {},
      grass: {
        node: {
          color: '#000'
        }
      },
      meta: {},
      requests: {
        xxx: {
          status: 'pending'
        }
      }
    })
    // Populate epic dependencies with store methods
    epicDependencies.dispatch = store.dispatch
    epicDependencies.getState = store.getState
    // Run the epic after store creation (redux-observable 1.x API)
    epicMiddleware.run(commands.handleSingleCommandEpic as any)
  })

  beforeEach(() => {
    // Reset bolt mocks to default behavior
    const boltMock = bolt as jest.Mocked<typeof bolt>
    boltMock.routedWriteTransaction.mockImplementation(() => [
      'id',
      Promise.resolve({ records: [] })
    ])
    boltMock.routedReadTransaction.mockImplementation(() =>
      Promise.resolve({ records: [] })
    )
  })

  afterEach(() => {
    store.clearActions()
    bus.reset()
  })

  describe('handleSingleCommandEpic', () => {
    test('listens on SINGLE_COMMAND_QUEUED for cypher commands and does a series of things', async () => {
      const cmd = 'RETURN 1'
      const id = 2
      const requestId = 'xxx'
      const action = commands.executeSingleCommand(cmd, {
        id,
        requestId
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      // Verify the sequence of actions
      expect(actions[0]).toEqual(action)
      // send() should use the requestId from action
      expect(actions[1]).toEqual(send(requestId))
      // frames/ADD for cypher - action has type='frames/ADD' and state contains the frame data
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('cypher')
      expect(actions[2].state.cmd).toBe(cmd)
      // Success status update
      expect(actions[3]).toMatchObject({
        type: 'requests/UPDATED',
        status: 'success'
      })
      expect(actions[4]).toEqual(commands.successfulCypher(cmd))
      expect(actions[5]).toEqual(fetchMetaData())
    })

    test('handles cypher command error correctly', async () => {
      // Configure mock to return error
      const boltError = BoltConnectionError()
      const boltMock = bolt as jest.Mocked<typeof bolt>
      boltMock.routedWriteTransaction.mockImplementation(() => [
        'id',
        Promise.reject(boltError)
      ])

      const cmd = 'RETURN 1'
      const id = 2
      const requestId = 'xxx'
      const action = commands.executeSingleCommand(cmd, {
        id,
        requestId
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual(send(requestId))
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('cypher')
      expect(actions[3]).toMatchObject({
        type: 'requests/UPDATED',
        status: 'error'
      })
      expect(actions[4]).toEqual(commands.unsuccessfulCypher(cmd))
    })

    test('empty SYSTEM_COMMAND_QUEUED gets ignored', async () => {
      const cmd = ' '
      const action = commands.executeSystemCommand(cmd)

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual({ type: 'NOOP' })
    })

    test('does the right thing for :param x: 2', async () => {
      const cmd = ':param'
      const cmdString = `${cmd} x: 2`
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual(updateParams({ x: 2 }))
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('param')
      expect(actions[2].state.success).toBe(true)
      expect(actions[2].state.params).toEqual({ x: 2 })
    })

    test('does the right thing for :param x => 2', async () => {
      const cmd = ':param'
      const cmdString = `${cmd} x => 2`
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      const boltMock = bolt as jest.Mocked<typeof bolt>
      boltMock.routedWriteTransaction.mockImplementation(
        (_input, _parameters, { requestId }) => [
          requestId ?? uuid(),
          Promise.resolve({
            records: [{ get: (): number => 2 }]
          } as unknown as QueryResult)
        ]
      )

      store.dispatch(action)
      const actions = await waitForAction(store, 'frames/ADD')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual(updateParams({ x: 2 }))
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('param')
      expect(actions[2].state.success).toBe(true)
      expect(actions[2].state.params).toEqual({ x: 2 })
    })

    test('does the right thing for :params {x: 2, y: 3}', async () => {
      const cmd = ':params'
      const cmdString = `${cmd} {x: 2, y: 3}`
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual(replaceParams({ x: 2, y: 3 }))
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('params')
      expect(actions[2].state.success).toBe(true)
    })

    test('does the right thing for :params', async () => {
      const cmdString = ':params'
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1].type).toBe('frames/ADD')
      expect(actions[1].state.type).toBe('params')
    })

    test('does the right thing for :config x: 2', async () => {
      const cmd = ':config'
      const cmdString = `${cmd} "x": 2`
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual(updateSettings({ x: 2 } as any))
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('pre')
    })

    test('does the right thing for :config {"x": 2, "y":3}', async () => {
      const cmd = ':config'
      const cmdString = `${cmd} {"x": 2, "y":3}`
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual(replaceSettings({ x: 2, y: 3 } as any))
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('pre')
    })

    test('does the right thing for :config', async () => {
      const cmd = ':config'
      const cmdString = cmd
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1].type).toBe('frames/ADD')
      expect(actions[1].state.type).toBe('pre')
    })

    test('does the right thing for :style', async () => {
      const cmd = ':style'
      const cmdString = cmd
      const id = 1
      const action = commands.executeSingleCommand(cmdString, {
        id
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1].type).toBe('frames/ADD')
      expect(actions[1].state.type).toBe('style')
      expect(actions[1].state.result).toEqual({ node: { color: '#000' } })
    })

    test('does the right thing for list queries', async () => {
      const cmd = ':queries'
      const id = 1
      const action = commands.executeSingleCommand(cmd, { id })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1].type).toBe('frames/ADD')
      expect(actions[1].state.type).toBe('queries')
      expect(actions[1].state.result).toBe("{res : 'QUERIES RESULT'}")
    })

    test('does the right thing for cypher with comments', async () => {
      const comment = '//COMMENT FOR RETURN'
      const actualCommand = 'RETURN 1'
      const cmd = `${comment}\n${actualCommand}`
      const id = 2
      const requestId = 'xxx'
      const action = commands.executeSingleCommand(cmd, {
        id,
        requestId
      })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1]).toEqual(send(requestId))
      expect(actions[2].type).toBe('frames/ADD')
      expect(actions[2].state.type).toBe('cypher')
      expect(actions[3]).toMatchObject({
        type: 'requests/UPDATED',
        status: 'success'
      })
    })

    test('does the right thing for history command', async () => {
      const cmdString = 'history'
      const cmd = `:${cmdString}`
      const id = 1
      const action = commands.executeSingleCommand(cmd, { id })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1].type).toBe('frames/ADD')
      expect(actions[1].state.type).toBe('history')
    })
  })

  describe(':server disconnect', () => {
    test(':server disconnect produces a DISCONNECT action and a action for a "disconnect" frame', async () => {
      const serverCmd = 'disconnect'
      const cmd = `:server ${serverCmd}`
      const action = commands.executeSingleCommand(cmd, { id: '$$discovery' })

      store.dispatch(action)
      const actions = await waitForAction(store, 'NOOP')

      expect(actions[0]).toEqual(action)
      expect(actions[1].type).toBe('frames/ADD')
      expect(actions[1].state.type).toBe('disconnect')
      expect(actions[2]).toEqual(disconnectAction('$$discovery'))
    })
  })
})
