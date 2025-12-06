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
import { AnyAction } from 'redux'
import { Epic, ofType, StateObservable } from 'redux-observable'
import { merge, of } from 'rxjs'
import { map, mergeMap, withLatestFrom } from 'rxjs/operators'
import { URL } from 'whatwg-url'

import { getAndMergeDiscoveryData } from './discoveryHelpers'
import { generateBoltUrl } from 'services/boltscheme.utils'
import {
  APP_START,
  CLOUD_SCHEMES,
  USER_CLEAR,
  getAllowedBoltSchemes,
  getHostedUrl,
  hasDiscoveryEndpoint,
  inDesktop
} from 'shared/modules/app/appDuck'
import {
  getConnection,
  updateConnection
} from 'shared/modules/connections/connectionsDuck'
import { GlobalState } from 'shared/globalState'
import { NEO4J_CLOUD_DOMAINS } from 'shared/modules/settings/settingsDuck'
import { isCloudHost } from 'shared/services/utils'

export const NAME = 'discover-bolt-host'
export const CONNECTION_ID = '$$discovery'

const initialState = {}
// Actions
const SET = `${NAME}/SET`
export const DONE = `${NAME}/DONE`
export const INJECTED_DISCOVERY = `${NAME}/INJECTED_DISCOVERY`

// Reducer
export default function reducer(state = initialState, action: any = {}) {
  switch (action.type) {
    case APP_START:
      return { ...initialState, ...state }
    case SET:
      return {
        ...state,
        boltHost: action.boltHost
      }
    default:
      return state
  }
}

// Action Creators
export const setBoltHost = (bolt: any) => {
  return {
    type: SET,
    boltHost: bolt
  }
}

export const updateDiscoveryConnection = (props: any) => {
  return updateConnection({
    ...props,
    id: CONNECTION_ID,
    name: CONNECTION_ID,
    type: 'bolt'
  })
}

export const getBoltHost = (state: any) => {
  return state.discovery.boltHost
}

const getAllowedBoltSchemesForHost = (
  state: any,
  host: string,
  encryptionFlag?: any
) =>
  isCloudHost(host, NEO4J_CLOUD_DOMAINS)
    ? CLOUD_SCHEMES
    : getAllowedBoltSchemes(state, encryptionFlag)

const createDiscoveryUpdateAction = (action: any) => {
  const keysToCopy = [
    'username',
    'password',
    'requestedUseDb',
    'restApi',
    'supportsMultiDb'
  ]
  const updateObj: any = keysToCopy.reduce(
    (accObj, key) => (action[key] ? { ...accObj, [key]: action[key] } : accObj),
    { host: action.forceUrl }
  )

  if (typeof action.encrypted !== 'undefined') {
    updateObj.encrypted = action.encrypted
  }

  return updateDiscoveryConnection(updateObj)
}

export const injectDiscoveryEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$: StateObservable<GlobalState>
) =>
  action$.pipe(
    ofType(INJECTED_DISCOVERY),
    withLatestFrom(state$),
    mergeMap(([action, state]: [any, GlobalState]) => {
      const connectUrl = generateBoltUrl(
        getAllowedBoltSchemesForHost(state, action.host, action.encrypted),
        action.host
      )
      const updateAction = createDiscoveryUpdateAction({
        ...action,
        forceUrl: connectUrl
      })
      return of(updateAction, { type: DONE })
    })
  )

export const discoveryOnStartupEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$: StateObservable<GlobalState>
) => {
  const appStart$ = action$.pipe(
    ofType(APP_START),
    withLatestFrom(state$),
    map(([action, state]: [any, GlobalState]) => {
      if (!action.url) return action
      const { searchParams } = new URL(action.url)

      const passedUrl =
        searchParams.get('dbms') || searchParams.get('connectURL')

      const passedDb = searchParams.get('db')

      const enrichedAction = { ...action }

      if (passedUrl) {
        enrichedAction.forceUrl = decodeURIComponent(passedUrl)
        enrichedAction.requestedUseDb = passedDb
      }

      const discoveryUrl = searchParams.get('discoveryURL')

      if (discoveryUrl) {
        enrichedAction.discoveryUrl = discoveryUrl
      }

      const discoveryConnection = getConnection(state, CONNECTION_ID)
      if (discoveryConnection) {
        enrichedAction.discoveryConnection = discoveryConnection
      }

      return enrichedAction
    })
  )

  const userClear$ = action$.pipe(ofType(USER_CLEAR))

  return merge(appStart$, userClear$).pipe(
    withLatestFrom(state$),
    mergeMap(async ([action, state]: [any, GlobalState]) => {
      if (inDesktop(state)) {
        return { type: 'NOOP' }
      }
      const discoveryData = await getAndMergeDiscoveryData({
        action,
        hostedUrl: getHostedUrl(state) ?? window.location.href,
        hasDiscoveryEndpoint: hasDiscoveryEndpoint(state),
        generateBoltUrlWithAllowedScheme: (boltUrl: string) =>
          generateBoltUrl(getAllowedBoltSchemesForHost(state, boltUrl), boltUrl)
      })

      if (!discoveryData) {
        return { type: DONE, discovered: {} }
      }

      return { type: DONE, discovered: { ...discoveryData } }
    })
  )
}
