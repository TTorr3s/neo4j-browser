/*
 * Copyright (c) "Neo4j"
 * Network Engine for Objects in Lund AB [http://neotechnology.com]
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
import { render, act } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'

import CypherFrame, { CypherFrameProps } from './CypherFrame'
import { Frame } from 'shared/modules/frames/framesDuck'
import { BrowserRequestResult } from 'shared/modules/requests/requestsDuck'

import { initialState as initialExperimentalFeatureState } from 'shared/modules/experimentalFeatures/experimentalFeaturesDuck'

const REQUEST_ID = 'test-request-id'

const createProps = (): CypherFrameProps => ({
  activeConnectionData: null,
  isCollapsed: false,
  isFullscreen: false,
  setExportItems: () => undefined,
  stack: [],
  frame: { cmd: 'return 1', requestId: REQUEST_ID } as Frame & {
    isPinned: false
  }
})

const createState = (status: string, result: BrowserRequestResult) => ({
  settings: {
    maxRows: 1000,
    maxFieldItems: 1000,
    initialNodeDisplay: 10,
    maxNeighbours: 10,
    autoComplete: true
  },
  app: {},
  connections: {},
  experimentalFeatures: initialExperimentalFeatureState,
  frames: {
    byId: {},
    allIds: [],
    recentView: null,
    nodePropertiesExpandedByDefault: true
  },
  requests: {
    [REQUEST_ID]: {
      status,
      updated: Date.now(),
      result,
      type: 'cypher'
    }
  }
})

const createStore = (state: ReturnType<typeof createState>) => ({
  subscribe: () => () => {},
  dispatch: () => {},
  getState: () => state
})

const withProvider = (store: any, children: any) => {
  return <Provider store={store}>{children}</Provider>
}

describe('CypherFrame', () => {
  test('renders accordingly from pending to success to error to success', async () => {
    // Given
    const props = createProps()

    // Create cached state objects to prevent infinite loops
    const pendingState = createState('pending', undefined)
    const successState = createState('success', {
      records: [{ keys: ['name'], _fields: ['Molly'], get: () => 'Molly' }]
    } as any)
    const errorState = createState('error', { code: 'Test.Error' } as any)

    const pendingStore = createStore(pendingState)
    const successStore = createStore(successState)
    const errorStore = createStore(errorState)

    // When
    const { queryByText, getByText, getAllByText, getByTestId, rerender } =
      render(withProvider(pendingStore, <CypherFrame {...props} />))

    // Then
    expect(getByTestId('spinner')).not.toBeNull()
    expect(getByText(/Table/i)).not.toBeNull()
    expect(getByText(/Code/i)).not.toBeNull()
    expect(queryByText(/Error/)).toBeNull()

    // When successful request
    await act(async () => {
      rerender(withProvider(successStore, <CypherFrame {...props} />))
    })

    // Then
    expect(getByText(/Molly/i)).not.toBeNull()
    expect(getByText(/Table/i)).not.toBeNull()
    expect(getByText(/Code/i)).not.toBeNull()
    expect(queryByText(/Error/)).toBeNull()

    // When error request
    await act(async () => {
      rerender(withProvider(errorStore, <CypherFrame {...props} />))
    })

    // Then
    expect(queryByText(/Table/i)).toBeNull()
    expect(queryByText(/Code/i)).toBeNull()
    expect(getAllByText(/Error/)).not.toBeNull()
    expect(getAllByText(/Test.Error/)).not.toBeNull()

    // When successful request again
    await act(async () => {
      rerender(withProvider(successStore, <CypherFrame {...props} />))
    })

    // Then
    expect(getByText(/Molly/i)).not.toBeNull()
    expect(getByText(/Table/i)).not.toBeNull()
    expect(getByText(/Code/i)).not.toBeNull()
    expect(queryByText(/Error/)).toBeNull()
  })
})
