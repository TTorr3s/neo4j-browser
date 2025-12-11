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
import { Epic, ofType } from 'redux-observable'
import { map } from 'rxjs/operators'

import { GlobalState } from 'shared/globalState'
import { APP_START } from 'shared/modules/app/appDuck'
import { DISCONNECTION_SUCCESS } from 'shared/modules/connections/connectionsDuck'

export const NAME = 'features'
const CLEAR = 'features/CLEAR'
export const UPDATE_USER_CAPABILITIES = 'features/UPDATE_USER_CAPABILITIES'
export const DETECTED_CLIENT_CONFIG = 'features/DETECTED_CLIENT_CONFIG'

export const hasClientConfig = (state: any) => state[NAME].clientConfig
export const getUserCapabilities = (state: any) => state[NAME].userCapabilities

export const USER_CAPABILITIES = {
  serverConfigReadable: 'serverConfigReadable'
}

export const initialState = {
  clientConfig: null,
  userCapabilities: {
    [USER_CAPABILITIES.serverConfigReadable]: false
  }
}

export default function (state = initialState, action: any) {
  switch (action.type) {
    case APP_START:
      return {
        ...initialState,
        ...state
      }
    case DETECTED_CLIENT_CONFIG:
      return { ...state, clientConfig: action.isAvailable }
    case UPDATE_USER_CAPABILITIES:
      return {
        ...state,
        userCapabilities: {
          ...state.userCapabilities,
          [action.capabilityName]: action.capabilityValue
        }
      }
    case CLEAR:
      return initialState
    default:
      return state
  }
}

export const updateUserCapability = (
  capabilityName: any,
  capabilityValue: any
) => {
  return {
    type: UPDATE_USER_CAPABILITIES,
    capabilityName,
    capabilityValue
  }
}

export const setClientConfig = (isAvailable: any) => {
  return {
    type: DETECTED_CLIENT_CONFIG,
    isAvailable
  }
}

export const clearOnDisconnectEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(DISCONNECTION_SUCCESS),
    map(() => ({ type: CLEAR }))
  )
