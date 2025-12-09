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
import { CONNECTION_SUCCESS } from 'shared/modules/connections/connectionsDuck'
import {
  ClientSettings,
  initialClientSettings,
  UPDATE_SETTINGS
} from '../dbMeta/dbMetaDuck'

describe('postConnectCmdEpic', () => {
  test('creates a SYSTEM_COMMAND_QUEUED if found', done => {
    // Given
    const bus = createBus()

    // Epic dependencies for redux-observable 2.x
    const epicDependencies: {
      dispatch: (action: any) => void
      getState: () => any
    } = {
      dispatch: () => {},
      getState: () => ({})
    }

    const epicMiddlewareLocal = createEpicMiddleware({
      dependencies: epicDependencies
    })
    const mockStoreLocal = configureMockStore([
      epicMiddlewareLocal,
      createReduxMiddleware(bus)
    ])
    const command = 'play hello'
    const metaSettings: ClientSettings = {
      ...initialClientSettings,
      postConnectCmd: command
    }
    const store: MockStoreEnhanced<unknown, unknown> = mockStoreLocal({
      settings: {
        playImplicitInitCommands: true
      },
      meta: {
        settings: metaSettings
      }
    })

    // Populate epic dependencies with store methods
    epicDependencies.dispatch = store.dispatch
    epicDependencies.getState = store.getState

    // Run the epic after store creation (redux-observable 2.x API)
    epicMiddlewareLocal.run(commands.postConnectCmdEpic as any)

    const action = { type: CONNECTION_SUCCESS }
    const action2 = { type: UPDATE_SETTINGS }
    bus.take('NOOP', () => {
      // Then
      expect(store.getActions()).toEqual([
        action,
        action2,
        commands.executeSystemCommand(`:${command}`),
        { type: 'NOOP' }
      ])
      done()
    })

    // When
    store.dispatch(action)
    store.dispatch(action2)
  })

  test('supports multiple commands', done => {
    // Given
    const command1 = 'play hello'
    const command2 = 'play intro'
    const command = `${command1}; ${command2}`
    const bus = createBus()

    // Epic dependencies for redux-observable 2.x
    const epicDependencies: {
      dispatch: (action: any) => void
      getState: () => any
    } = {
      dispatch: () => {},
      getState: () => ({})
    }

    const epicMiddlewareLocal = createEpicMiddleware({
      dependencies: epicDependencies
    })
    const mockStoreLocal = configureMockStore([
      epicMiddlewareLocal,
      createReduxMiddleware(bus)
    ])

    const metaSettings: ClientSettings = {
      ...initialClientSettings,
      postConnectCmd: command
    }
    const store: MockStoreEnhanced<unknown, unknown> = mockStoreLocal({
      settings: {
        playImplicitInitCommands: true
      },
      meta: {
        settings: metaSettings
      }
    })

    // Populate epic dependencies with store methods
    epicDependencies.dispatch = store.dispatch
    epicDependencies.getState = store.getState

    // Run the epic after store creation (redux-observable 2.x API)
    epicMiddlewareLocal.run(commands.postConnectCmdEpic as any)

    const action = { type: CONNECTION_SUCCESS }
    const action2 = { type: UPDATE_SETTINGS }
    bus.take('NOOP', () => {
      // Then
      expect(store.getActions()).toEqual([
        action,
        action2,
        commands.executeSystemCommand(`:${command1}`),
        commands.executeSystemCommand(`:${command2}`),
        { type: 'NOOP' }
      ])
      done()
    })

    // When
    store.dispatch(action)
    store.dispatch(action2)
  })

  test('does nothing if settings not found', done => {
    // Given
    const bus = createBus()

    // Epic dependencies for redux-observable 2.x
    const epicDependencies: {
      dispatch: (action: any) => void
      getState: () => any
    } = {
      dispatch: () => {},
      getState: () => ({})
    }

    const epicMiddlewareLocal = createEpicMiddleware({
      dependencies: epicDependencies
    })
    const mockStoreLocal = configureMockStore([
      epicMiddlewareLocal,
      createReduxMiddleware(bus)
    ])
    const store: MockStoreEnhanced<unknown, unknown> = mockStoreLocal({
      settings: {},
      history: {
        history: [':xxx']
      },
      connections: {},
      params: {}
    })

    // Populate epic dependencies with store methods
    epicDependencies.dispatch = store.dispatch
    epicDependencies.getState = store.getState

    // Run the epic after store creation (redux-observable 2.x API)
    epicMiddlewareLocal.run(commands.postConnectCmdEpic as any)

    const action = { type: CONNECTION_SUCCESS }
    const action2 = { type: UPDATE_SETTINGS }
    bus.take('NOOP', () => {
      // Then
      expect(store.getActions()).toEqual([action, action2, { type: 'NOOP' }])
      done()
    })

    // When
    store.dispatch(action)
    store.dispatch(action2)
  })
})
