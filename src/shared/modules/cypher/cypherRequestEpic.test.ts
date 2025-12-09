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
import { createStore, applyMiddleware, combineReducers } from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import { createBus, createReduxMiddleware } from 'suber'

import { CYPHER_REQUEST, cypherRequestEpic } from './cypherDuck'
import {
  getUserTxMetadata,
  NEO4J_BROWSER_USER_QUERY
} from 'services/bolt/txMetadata'

jest.mock('services/bolt/bolt', () => ({
  __esModule: true,
  default: {
    directTransaction: jest.fn(() => Promise.resolve({ records: [] }))
  }
}))
const bolt = jest.requireMock('services/bolt/bolt').default

describe('cypherRequestEpic', () => {
  let store: any
  let bus: ReturnType<typeof createBus>

  beforeEach(() => {
    bus = createBus()
    const epicMiddleware = createEpicMiddleware()
    const rootReducer = combineReducers({
      settings: (state = {}) => state
    })
    store = createStore(
      rootReducer,
      applyMiddleware(epicMiddleware, createReduxMiddleware(bus))
    )
    epicMiddleware.run(cypherRequestEpic)
  })

  afterEach(() => {
    bus.reset()
    bolt.directTransaction.mockClear()
  })

  test('cypherRequestEpic passes along tx metadata if a queryType exists on action', () => {
    // Given
    const action = {
      type: CYPHER_REQUEST,
      query: 'RETURN 1',
      queryType: NEO4J_BROWSER_USER_QUERY,
      $$responseChannel: 'test-1'
    }

    const p = new Promise<void>((resolve, reject) => {
      bus.take(action.$$responseChannel, () => {
        // Then
        try {
          expect(bolt.directTransaction).toHaveBeenCalledTimes(1)
          expect(bolt.directTransaction).toHaveBeenCalledWith(
            action.query,
            undefined,
            expect.objectContaining({
              txMetadata: getUserTxMetadata(NEO4J_BROWSER_USER_QUERY).txMetadata
            })
          )
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })

    // When
    store.dispatch(action)

    // Return
    return p
  })

  test('cypherRequestEpic handles actions without queryType', () => {
    // Given
    // No queryType = uses default tx metadata
    const action = {
      type: CYPHER_REQUEST,
      query: 'RETURN 1',
      $$responseChannel: 'test-2'
    }

    const p = new Promise<void>((resolve, reject) => {
      bus.take(action.$$responseChannel, () => {
        // Then
        try {
          expect(bolt.directTransaction).toHaveBeenCalledTimes(1)
          expect(bolt.directTransaction).toHaveBeenCalledWith(
            action.query,
            undefined,
            expect.objectContaining({
              txMetadata: getUserTxMetadata().txMetadata
            })
          )
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })

    // When
    store.dispatch(action)

    // Return
    return p
  })
})
