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

const updateDiscoveryState = (action: any, store: any) => {
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

  const updateAction = updateDiscoveryConnection(updateObj)
  store.dispatch(updateAction)
}

export const injectDiscoveryEpic = (action$: any, store: any) =>
  action$
    .ofType(INJECTED_DISCOVERY)
    .map((action: any) => {
      const connectUrl = generateBoltUrl(
        getAllowedBoltSchemesForHost(
          store.getState(),
          action.host,
          action.encrypted
        ),
        action.host
      )
      return updateDiscoveryState({ ...action, forceUrl: connectUrl }, store)
    })
    .mapTo({ type: DONE })

export const discoveryOnStartupEpic = (some$: any, store: any) => {
  return some$
    .ofType(APP_START)
    .map((action: any) => {
      if (!action.url) return action
      const { searchParams } = new URL(action.url)

      const passedUrl =
        searchParams.get('dbms') || searchParams.get('connectURL')

      const passedDb = searchParams.get('db')

      if (passedUrl) {
        action.forceUrl = decodeURIComponent(passedUrl)
        action.requestedUseDb = passedDb
      }

      const discoveryUrl = searchParams.get('discoveryURL')

      if (discoveryUrl) {
        action.discoveryUrl = discoveryUrl
      }

      const discoveryConnection = getConnection(store.getState(), CONNECTION_ID)
      if (discoveryConnection) {
        action.discoveryConnection = discoveryConnection
      }

      return action
    })
    .merge(some$.ofType(USER_CLEAR))
    .mergeMap(async (action: any) => {
      if (inDesktop(store.getState())) {
        return { type: 'NOOP' }
      }
      const discoveryData = await getAndMergeDiscoveryData({
        action,
        hostedUrl: getHostedUrl(store.getState()) ?? window.location.href,
        hasDiscoveryEndpoint: hasDiscoveryEndpoint(store.getState()),
        generateBoltUrlWithAllowedScheme: (boltUrl: string) =>
          generateBoltUrl(
            getAllowedBoltSchemesForHost(store.getState(), boltUrl),
            boltUrl
          )
      })

      if (!discoveryData) {
        return { type: DONE, discovered: {} }
      }

      return { type: DONE, discovered: { ...discoveryData } }
    })
    .map((a: any) => a)
}
