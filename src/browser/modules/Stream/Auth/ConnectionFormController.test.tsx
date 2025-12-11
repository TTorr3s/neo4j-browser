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
import { fireEvent, render, act } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'

import ConnectionFormController from './ConnectionFormController'
import { BusContext } from 'browser-hooks/useBus'
import { CONNECTION_ID } from 'shared/modules/discovery/discoveryDuck'

const createMockStore = (
  overrides: {
    isConnected?: boolean
    storeCredentials?: boolean
    host?: string
    username?: string
    authEnabled?: boolean
  } = {}
) => {
  const {
    isConnected = false,
    storeCredentials = true,
    host = '',
    username = '',
    authEnabled = true
  } = overrides

  const state = {
    connections: {
      connectionState: isConnected ? 2 : 0,
      activeConnection: isConnected ? CONNECTION_ID : null,
      connectionsById: {
        [CONNECTION_ID]: {
          id: CONNECTION_ID,
          host,
          username,
          password: '',
          authEnabled
        }
      },
      allConnectionIds: [CONNECTION_ID]
    },
    settings: {
      initCmd: '',
      playImplicitInitCommands: false
    },
    meta: {
      role: null,
      server: {
        edition: 'enterprise',
        storeSize: null,
        version: '4.4.0'
      },
      settings: {
        retainConnectionCredentials: storeCredentials,
        credentialTimeout: 0
      }
    },
    app: {
      allowedBoltSchemes: ['neo4j', 'bolt']
    }
  }

  return {
    getState: () => state,
    subscribe: () => () => {},
    dispatch: jest.fn()
  }
}

const createMockBus = () => ({
  self: jest.fn((_type, _data, callback) => {
    callback({ success: true })
  }),
  send: jest.fn()
})

describe('ConnectionFormController', () => {
  test('should render connection form when not connected', async () => {
    const mockBus = createMockBus()
    const error = jest.fn()

    const mockStore = createMockStore({
      isConnected: false,
      storeCredentials: true
    })

    const { getByText, getByTestId } = render(
      <Provider store={mockStore as any}>
        <BusContext.Provider value={mockBus as any}>
          <ConnectionFormController frame={{}} error={error} />
        </BusContext.Provider>
      </Provider>
    )

    // Form should be visible
    expect(getByText(/connect url/i)).toBeDefined()
    expect(getByTestId('boltaddress')).toBeDefined()
    expect(getByTestId('username')).toBeDefined()
    expect(getByTestId('password')).toBeDefined()
    expect(getByTestId('connect')).toBeDefined()
  })

  test('should call bus.self with CONNECT when connect button is clicked', async () => {
    const mockBus = createMockBus()
    const error = jest.fn()

    const mockStore = createMockStore({
      isConnected: false,
      storeCredentials: true
    })

    const { getByTestId } = render(
      <Provider store={mockStore as any}>
        <BusContext.Provider value={mockBus as any}>
          <ConnectionFormController frame={{}} error={error} />
        </BusContext.Provider>
      </Provider>
    )

    // Fill form
    fireEvent.change(getByTestId('boltaddress'), {
      target: { value: 'my-host' }
    })
    fireEvent.change(getByTestId('username'), { target: { value: 'neo4j' } })
    fireEvent.change(getByTestId('password'), { target: { value: 'password' } })

    await act(async () => {
      fireEvent.click(getByTestId('connect'))
    })

    // Should have called bus.self with CONNECT
    expect(mockBus.self).toHaveBeenCalled()
  })
})
