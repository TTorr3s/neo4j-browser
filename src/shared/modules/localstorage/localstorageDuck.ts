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
import { of } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

import { GlobalState } from 'shared/globalState'
import { USER_CLEAR, UserClearAction } from 'shared/modules/app/appDuck'
import {
  disconnectAction,
  getActiveConnection
} from 'shared/modules/connections/connectionsDuck'

export const NAME = 'localstorage'
export const CLEAR_LOCALSTORAGE = `${NAME}/CLEAR_LOCALSTORAGE`

// Epics
export const clearLocalstorageEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$: StateObservable<GlobalState>
) =>
  action$.pipe(
    ofType(CLEAR_LOCALSTORAGE),
    mergeMap(() => {
      const actions: AnyAction[] = []
      const activeConnection = getActiveConnection(state$.value)
      if (activeConnection) {
        actions.push(disconnectAction(activeConnection))
      }
      actions.push({ type: USER_CLEAR } as UserClearAction)
      return of(...actions)
    })
  )
