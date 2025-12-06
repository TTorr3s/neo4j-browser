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
import {
  AnyAction,
  StoreEnhancer,
  applyMiddleware,
  combineReducers,
  compose,
  createStore
} from 'redux'
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
// Define Redux middlewares
const suberMiddleware = createSuberReduxMiddleware(bus)
const epicMiddleware = createEpicMiddleware(epics)
const localStorageMiddleware = createReduxMiddleware()

const reducer = combineReducers<GlobalState>({ ...(reducers as any) })

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: (
      ...args: unknown[]
    ) => StoreEnhancer<unknown>
  }
}

const enhancer: StoreEnhancer<GlobalState> = compose(
  applyMiddleware(suberMiddleware, epicMiddleware, localStorageMiddleware),
  process.env.NODE_ENV !== 'production' && window.__REDUX_DEVTOOLS_EXTENSION__
    ? window.__REDUX_DEVTOOLS_EXTENSION__({
        actionSanitizer: (action: AnyAction) =>
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
        stateSanitizer: (state: GlobalState) => ({
          ...state,
          requests: Object.assign(
            {},
            ...Object.entries(state.requests).map(([id, request]) => ({
              [id]: {
                ...request,
                result: {
                  ...request.result,
                  records:
                    'REQUEST RECORDS OMITTED FROM REDUX DEVTOOLS TO PREVENT OUT OF MEMORY ERROR'
                }
              }
            }))
          )
        })
      })
    : (f: unknown) => f
)

const store = createStore<GlobalState>(
  reducer,
  getAll() as GlobalState, // rehydrate from local storage on app start
  enhancer
)

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
store.dispatch(updateUdcData({ auraNtId }))

const AppInit = (): JSX.Element => {
  return (
    <Provider store={store as any}>
      <BusProvider bus={bus}>
        <DndProvider backend={HTML5Backend}>
          <App />
        </DndProvider>
      </BusProvider>
    </Provider>
  )
}
export default AppInit
