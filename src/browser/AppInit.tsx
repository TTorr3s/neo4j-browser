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
import React from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Provider } from 'react-redux'
import { BusProvider } from 'react-suber'
import { configureStore, Middleware, Tuple } from '@reduxjs/toolkit'
import { AnyAction } from 'redux'
import { createEpicMiddleware } from 'redux-observable'
import {
  createBus,
  createReduxMiddleware as createSuberReduxMiddleware
} from 'suber'

import App from './modules/App/App'
import { applyKeys, createReduxMiddleware, getAll } from 'services/localstorage'
import { detectRuntimeEnv } from 'services/utils'
import { GlobalState } from 'shared/globalState'
import { APP_START } from 'shared/modules/app/appDuck'
import { NEO4J_CLOUD_DOMAINS } from 'shared/modules/settings/settingsDuck'
import { updateUdcData } from 'shared/modules/udc/udcDuck'
import epics from 'shared/rootEpic'
import reducers from 'shared/rootReducer'
import { URL } from 'whatwg-url'

// Configure localstorage sync
applyKeys(
  'connections',
  'settings',
  'history',
  'documents',
  'folders',
  'grass',
  'udc',
  'experimentalFeatures'
)

// Create suber bus
const bus = createBus()

// Epic dependencies - these will be populated after store creation
// This allows epics to access dispatch/getState for complex async flows
export type EpicDependencies = {
  dispatch: (action: AnyAction) => void
  getState: () => GlobalState
}
const epicDependencies: EpicDependencies = {
  dispatch: () => {
    throw new Error('Store not initialized')
  },
  getState: () => {
    throw new Error('Store not initialized')
  }
}

// Define Redux middlewares
const suberMiddleware = createSuberReduxMiddleware(bus)
const epicMiddleware = createEpicMiddleware<
  AnyAction,
  AnyAction,
  GlobalState,
  EpicDependencies
>({ dependencies: epicDependencies })
const localStorageMiddleware = createReduxMiddleware()

// DevTools sanitizers to prevent memory issues with large query results
// Note: Using 'any' for sanitizer types to maintain compatibility with Redux DevTools
const devToolsOptions =
  process.env.NODE_ENV !== 'production'
    ? {
        actionSanitizer: (action: any) =>
          action.type === 'requests/UPDATED'
            ? {
                ...action,
                result: {
                  summary: action.result ? action.result.summary : undefined,
                  records:
                    'REQUEST RECORDS OMITTED FROM REDUX DEVTOOLS TO PREVENT OUT OF MEMORY ERROR'
                }
              }
            : action,
        stateSanitizer: (state: any) => ({
          ...state,
          requests: Object.assign(
            {},
            ...Object.entries(state.requests || {}).map(
              ([id, request]: [string, any]) => ({
                [id]: {
                  ...request,
                  result: {
                    ...request.result,
                    records:
                      'REQUEST RECORDS OMITTED FROM REDUX DEVTOOLS TO PREVENT OUT OF MEMORY ERROR'
                  }
                }
              })
            )
          )
        })
      }
    : false

const store = configureStore({
  reducer: reducers as any,
  preloadedState: getAll() as GlobalState,
  middleware: () =>
    new Tuple(
      suberMiddleware as Middleware,
      epicMiddleware as Middleware,
      localStorageMiddleware as Middleware
    ),
  devTools: devToolsOptions
})

// Populate epic dependencies now that store is created
epicDependencies.dispatch = store.dispatch
epicDependencies.getState = store.getState

// Run the root epic after store creation (redux-observable 1.x API)
epicMiddleware.run(epics)

// Send everything from suber into Redux
bus.applyMiddleware(
  (_, origin) => (channel: string, message: AnyAction, source: string) => {
    // No loop-backs
    if (source === 'redux') return
    // Send to Redux with the channel as the action type
    store.dispatch({ ...message, type: channel, ...origin })
  }
)

// Introduce environment to be able to fork functionality
const env = detectRuntimeEnv(window, NEO4J_CLOUD_DOMAINS)

// URL we're on
const url = window.location.href

const searchParams = new URL(url).searchParams

// Signal app upstart (for epics)
store.dispatch({
  type: APP_START,
  url,
  env
})

const auraNtId = searchParams.get('ntid') ?? undefined
if (auraNtId) {
  // Remove ntid from URL without page reload
  const newUrl = new URL(window.location.href)
  newUrl.searchParams.delete('ntid')
  window.history.replaceState({}, '', newUrl.toString())
}
store.dispatch(updateUdcData({ auraNtId }) as any)

// StrictMode is only enabled in development to help detect:
// - Components with unsafe lifecycles
// - Legacy string ref API usage
// - Deprecated findDOMNode usage
// - Unexpected side effects (via double-invoking effects)
// - Legacy context API
const isDevelopment = process.env.NODE_ENV === 'development'

const AppInit = (): JSX.Element => {
  const appContent = <App />

  return (
    <Provider store={store as any}>
      {/* @ts-expect-error BusProvider types from react-suber don't include children prop for React 18 */}
      <BusProvider bus={bus}>
        <DndProvider backend={HTML5Backend}>
          {isDevelopment ? (
            <React.StrictMode>{appContent}</React.StrictMode>
          ) : (
            appContent
          )}
        </DndProvider>
      </BusProvider>
    </Provider>
  )
}
export default AppInit
