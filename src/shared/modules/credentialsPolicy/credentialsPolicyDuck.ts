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
import { merge, of, EMPTY } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

import { parseTimeMillis } from 'services/utils'
import { GlobalState } from 'shared/globalState'
import {
  disconnectAction,
  getActiveConnection
} from 'shared/modules/connections/connectionsDuck'
import { credentialsTimeout } from 'shared/modules/dbMeta/dbMetaDuck'
import { USER_INTERACTION } from 'shared/modules/userInteraction/userInteractionDuck'

// Local variables (used in epics)
let timer: any = null

export const NAME = `credentialsPolicy`
export const TRIGGER_CREDENTIALS_TIMEOUT = `${NAME}/TRIGGER_CREDENTIALS_TIMEOUT`
export const triggerCredentialsTimeout = () => {
  return { type: TRIGGER_CREDENTIALS_TIMEOUT }
}

// Epics
// This epic manages credentials timeout - when triggered or on user interaction,
// it resets a timer that will disconnect the user after the configured timeout period.
// The dispatch happens via observable emission after the timer fires.
// We use state$.value to read current state at timeout time (not action dispatch time).
export const credentialsTimeoutEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$
) =>
  merge(
    action$.pipe(ofType<AnyAction>(TRIGGER_CREDENTIALS_TIMEOUT)),
    action$.pipe(ofType<AnyAction>(USER_INTERACTION))
  ).pipe(
    mergeMap(() => {
      const cTimeout = parseTimeMillis(credentialsTimeout(state$.value))
      if (!cTimeout) {
        clearTimeout(timer)
        return EMPTY
      }
      clearTimeout(timer)

      // Return an Observable that emits the disconnect action after timeout
      return new Promise<AnyAction | null>(resolve => {
        timer = setTimeout(() => {
          // Get current state at time of timeout using state$.value
          const activeConnection = getActiveConnection(state$.value)
          if (activeConnection) {
            resolve(disconnectAction(activeConnection))
          } else {
            resolve(null)
          }
        }, cTimeout)
      }).then(action => (action ? of(action) : EMPTY))
    }),
    mergeMap(obs => obs)
  )
