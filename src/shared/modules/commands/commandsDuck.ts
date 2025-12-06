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
import { merge } from 'rxjs'
import { map, mergeMap, tap, take, ignoreElements } from 'rxjs/operators'
import { v4 } from 'uuid'

import { GlobalState } from 'shared/globalState'
import { CONNECTION_SUCCESS } from '../connections/connectionsDuck'
import { getAvailableSettings, UPDATE_SETTINGS } from '../dbMeta/dbMetaDuck'
import { addHistory } from '../history/historyDuck'
import {
  getMaxHistory,
  getPlayImplicitInitCommands,
  shouldEnableMultiStatementMode
} from '../settings/settingsDuck'
import helper from 'services/commandInterpreterHelper'
import {
  buildCommandObject,
  cleanCommand,
  extractPostConnectCommandsFromServerConfig,
  extractStatementsFromString
} from 'services/commandUtils'
import { serialExecution } from 'services/utils'
import { APP_START, USER_CLEAR } from 'shared/modules/app/appDuck'
import { add as addFrame } from 'shared/modules/frames/framesDuck'
import { update as updateQueryResult } from 'shared/modules/requests/requestsDuck'
import { CYPHER_FAILED, CYPHER_SUCCEEDED } from './actionTypes'

export const NAME = 'commands'
export const SINGLE_COMMAND_QUEUED = `${NAME}/SINGLE_COMMAND_QUEUED`
export const COMMAND_QUEUED = `${NAME}/COMMAND_QUEUED`
export const SYSTEM_COMMAND_QUEUED = `${NAME}/SYSTEM_COMMAND_QUEUED`
export const UNKNOWN_COMMAND = `${NAME}/UNKNOWN_COMMAND`
export const SHOW_ERROR_MESSAGE = `${NAME}/SHOW_ERROR_MESSAGE`
export const CLEAR_ERROR_MESSAGE = `${NAME}/CLEAR_ERROR_MESSAGE`
// Re-export for backward compatibility
export { CYPHER_SUCCEEDED, CYPHER_FAILED }

export const useDbCommand = 'use'
export const listDbsCommand = 'dbs'
export const autoCommitTxCommand = 'auto'

const initialState = {}
export const getErrorMessage = (state: any) => state[NAME].errorMessage
export const allowlistedMultiCommands = () => [':param', ':use', ':auto']

export default function reducer(state = initialState, action: any) {
  switch (action.type) {
    case APP_START:
      return { ...initialState, ...state }
    case SHOW_ERROR_MESSAGE:
      return { errorMessage: action.errorMessage }
    case CLEAR_ERROR_MESSAGE:
      return {}
    case USER_CLEAR:
      return initialState
    default:
      return state
  }
}

// Action creators

export interface ExecuteSingleCommandAction {
  type: typeof SINGLE_COMMAND_QUEUED
  cmd: string
  id?: number | string
  requestId?: string
  useDb?: string | null
  isRerun?: boolean
}

export interface ExecuteCommandAction extends ExecuteSingleCommandAction {
  type: typeof COMMAND_QUEUED
  parentId?: string
  source?: string
}

export const commandSources = {
  button: 'BUTTON',
  playButton: 'PLAY-BUTTON',
  auto: 'AUTOMATIC',
  editor: 'EDITOR',
  rerunFrame: 'RERUN',
  favorite: 'FAVORITE',
  sidebar: 'SIDEBAR',
  url: 'URL'
}

export const executeSingleCommand = (
  cmd: string,
  {
    id,
    requestId,
    useDb,
    isRerun = false
  }: {
    id?: number | string
    requestId?: string
    useDb?: string | null
    isRerun?: boolean
  } = {}
): ExecuteSingleCommandAction => {
  return {
    type: SINGLE_COMMAND_QUEUED,
    cmd,
    id,
    requestId,
    useDb,
    isRerun
  }
}

export const executeCommand = (
  cmd: string,
  {
    id = undefined,
    requestId = undefined,
    parentId = undefined,
    useDb = undefined,
    isRerun = false,
    source = undefined
  }: {
    id?: number | string
    requestId?: string
    parentId?: string
    useDb?: string | null
    isRerun?: boolean
    source?: string
  } = {}
): ExecuteCommandAction => {
  return {
    type: COMMAND_QUEUED,
    cmd,
    id,
    requestId,
    parentId,
    useDb,
    isRerun,
    source
  }
}

export const executeSystemCommand = (cmd: any) => {
  return {
    type: SYSTEM_COMMAND_QUEUED,
    cmd
  }
}

export const unknownCommand = (cmd: any) => ({
  type: UNKNOWN_COMMAND,
  cmd
})

export const showErrorMessage = (errorMessage: any) => ({
  type: SHOW_ERROR_MESSAGE,
  errorMessage
})
export const clearErrorMessage = () => ({
  type: CLEAR_ERROR_MESSAGE
})

export const successfulCypher = (query: any) => ({
  type: CYPHER_SUCCEEDED,
  query
})
export const unsuccessfulCypher = (query: any) => ({
  type: CYPHER_FAILED,
  query
})

// Epics

// Type for epic dependencies (dispatch/getState for complex async flows)
type EpicDependencies = {
  dispatch: (action: AnyAction) => void
  getState: () => GlobalState
}

export const handleCommandEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState,
  EpicDependencies
> = (action$, _state$, { dispatch, getState }) =>
  action$.pipe(
    ofType(COMMAND_QUEUED),
    tap((action: AnyAction) => {
      const cmdAction = action as ExecuteCommandAction
      // Map some commands to the help command
      let cmd = cmdAction.cmd
      if (['?', 'help', ':'].includes(cmd)) {
        cmd = ':help'
      }

      dispatch(clearErrorMessage())
      const maxHistory = getMaxHistory(getState())
      dispatch(addHistory(cmd, maxHistory))

      // extractStatementsFromString is _very_ slow. So we check if we can
      // skip it. If there are no semi colons apart from the final character
      // it can't be a multistatement and we can bail out early
      const couldBeMultistatement =
        cmd.split(';').filter((a: string) => a.trim() !== '').length > 1

      // Semicolons in :style grass break parsing of multiline statements from codemirror.
      const useMultiStatement =
        couldBeMultistatement &&
        !cmd.startsWith(':style') &&
        shouldEnableMultiStatementMode(getState())

      const statements = useMultiStatement
        ? extractStatementsFromString(cmd)
        : [cmd]

      if (!statements.length || !statements[0]) {
        return
      }
      if (statements.length === 1) {
        // Single command
        dispatch(
          executeSingleCommand(cmd, {
            id: cmdAction.id,
            requestId: cmdAction.requestId,
            useDb: cmdAction.useDb,
            isRerun: cmdAction.isRerun
          })
        )
        return
      }
      const parentId =
        (cmdAction.isRerun ? cmdAction.id : cmdAction.parentId) || v4()
      dispatch(
        addFrame({
          type: 'cypher-script',
          id: parentId,
          cmd,
          isRerun: cmdAction.isRerun
        } as any)
      )
      const jobs = statements.map((stmtCmd: string) => {
        const cleanCmd = cleanCommand(stmtCmd)
        const requestId = v4()
        const cmdId = v4()
        const allowlistedCommands = allowlistedMultiCommands()
        const isAllowlisted = allowlistedCommands.some(wcmd =>
          cleanCmd.startsWith(wcmd)
        )

        // Ignore client commands that aren't allowlisted
        const ignore = cleanCmd.startsWith(':') && !isAllowlisted

        const { action: builtAction, interpreted } = buildCommandObject(
          { cmd: cleanCmd, ignore },
          helper.interpret
        )
        builtAction.requestId = requestId
        builtAction.parentId = parentId
        builtAction.id = cmdId
        dispatch(
          addFrame({ ...builtAction, requestId, type: interpreted.name })
        )
        dispatch(updateQueryResult(requestId, null, 'waiting'))
        // Create a store-like object for interpreted.exec compatibility
        const storeCompat = { dispatch, getState }
        return {
          workFn: () => interpreted.exec(builtAction, dispatch, storeCompat),
          onStart: () => {
            /* no op */
          },
          onSkip: () => dispatch(updateQueryResult(requestId, null, 'skipped'))
        }
      })

      serialExecution(...jobs).catch(() => {})
    }),
    ignoreElements()
  )

export const handleSingleCommandEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState,
  EpicDependencies
> = (action$, _state$, { dispatch, getState }) =>
  merge(
    action$.pipe(ofType<AnyAction>(SINGLE_COMMAND_QUEUED)),
    action$.pipe(ofType<AnyAction>(SYSTEM_COMMAND_QUEUED))
  ).pipe(
    map((action: AnyAction) => buildCommandObject(action, helper.interpret)),
    mergeMap(({ action, interpreted }: any) => {
      return new Promise<AnyAction>(resolve => {
        const noop: AnyAction = { type: 'NOOP' }
        if (!(action.cmd || '').trim().length) {
          resolve(noop)
          return
        }
        if (interpreted.name !== 'cypher') {
          action.cmd = cleanCommand(action.cmd)
        }
        action.ts = new Date().getTime()
        // Create a store-like object for interpreted.exec compatibility
        const storeCompat = { dispatch, getState }
        const res = interpreted.exec(action, dispatch, storeCompat)
        if (!res || !res.then) {
          resolve(noop)
        } else {
          res
            .then(() => {
              resolve(noop)
            })
            .catch(() => resolve(noop))
        }
      })
    })
  )

export const postConnectCmdEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState,
  EpicDependencies
> = (action$, _state$, { dispatch, getState }) =>
  action$.pipe(
    ofType(CONNECTION_SUCCESS),
    mergeMap(() =>
      action$.pipe(
        ofType(UPDATE_SETTINGS),
        take(1),
        map(() => {
          const serverSettings = getAvailableSettings(getState())
          if (serverSettings && serverSettings.postConnectCmd) {
            const cmds = extractPostConnectCommandsFromServerConfig(
              serverSettings.postConnectCmd
            )
            const playImplicitInitCommands =
              getPlayImplicitInitCommands(getState())
            if (playImplicitInitCommands && cmds !== undefined) {
              cmds.forEach((cmd: any) => {
                dispatch(executeSystemCommand(`:${cmd}`))
              })
            }
          }
          return { type: 'NOOP' } as AnyAction
        })
      )
    )
  )
