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
import {
  setupAutocomplete,
  initalizeCypherSupport,
  toFunction,
  toLabel,
  toProcedure,
  toRelationshipType
} from 'neo4j-arc/cypher-language-support'
import { AnyAction } from 'redux'
import { Epic, ofType } from 'redux-observable'
import { of, EMPTY, ReplaySubject } from 'rxjs'
import {
  mergeMap,
  filter,
  tap,
  take,
  delay,
  withLatestFrom,
  map,
  mapTo,
  distinctUntilChanged,
  catchError,
  delayWhen
} from 'rxjs/operators'

import consoleCommands from 'browser/modules/Editor/consoleCommands'
import { getUrlParamValue } from 'services/utils'
import { GlobalState } from 'shared/globalState'
import { APP_START, URL_ARGUMENTS_CHANGE } from 'shared/modules/app/appDuck'
import {
  commandSources,
  executeCommand
} from 'shared/modules/commands/commandsDuck'
import {
  DISABLE_IMPLICIT_INIT_COMMANDS,
  getTheme
} from 'shared/modules/settings/settingsDuck'
import { UPDATE_PARAMS } from '../params/paramsDuck'
import { isOfType } from 'shared/utils/typeSafeActions'
import { DB_META_DONE, LABELS_LOADED } from '../dbMeta/dbMetaDuck'

export const SET_CONTENT = 'editor/SET_CONTENT'
export const EDIT_CONTENT = 'editor/EDIT_CONTENT'
export const FOCUS = 'editor/FOCUS'
export const EXPAND = 'editor/EXPAND'
export const NOT_SUPPORTED_URL_PARAM_COMMAND =
  'editor/NOT_SUPPORTED_URL_PARAM_COMMAND'
export const CYPHER_EDITOR_READY = 'editor/CYPHER_EDITOR_READY'

interface CypherEditorReadyAction {
  type: typeof CYPHER_EDITOR_READY
}

export const cypherEditorReady = (): CypherEditorReadyAction => ({
  type: CYPHER_EDITOR_READY
})

// Supported commands
const validCommandTypes: { [key: string]: (args: string[]) => string } = {
  play: args => `:play ${args.join(' ')}`,
  guide: args => `:guide ${args.join(' ')}`,
  edit: args => args.join('\n'),
  param: args => `:param ${args.join(' ')}`,
  params: args => `:params ${args.join(' ')}`
}

interface SetContentAction {
  type: typeof SET_CONTENT
  message: string
}

export const setContent = (message: string): SetContentAction => ({
  type: SET_CONTENT,
  message
})

interface EditContentAction {
  type: typeof EDIT_CONTENT
  message: string
  id: string
  isStatic: boolean
  name: null | string
  directory: null
}

interface EditContentOptions {
  name?: string | null
  isStatic?: boolean
}

export const editContent = (
  id = '',
  message: string,
  { name = null, isStatic = false }: EditContentOptions = {}
): EditContentAction => ({
  type: EDIT_CONTENT,
  message,
  id,
  isStatic,
  name,
  directory: null
})

export const populateEditorFromUrlEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ => {
  return action$.pipe(
    ofType(APP_START, URL_ARGUMENTS_CHANGE),
    delay(1), // Timing issue. Needs to be detached like this
    mergeMap(action => {
      if (!action.url) {
        return EMPTY
      }
      const cmdParam = getUrlParamValue('cmd', action.url)

      // No URL command param found
      if (!cmdParam || !cmdParam[0]) {
        return EMPTY
      }

      // Not supported URL param command
      if (!Object.keys(validCommandTypes).includes(cmdParam[0])) {
        return of({
          type: NOT_SUPPORTED_URL_PARAM_COMMAND,
          command: cmdParam[0]
        })
      }

      const commandType = cmdParam[0]
      // Credits to https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent
      // for the "decodeURIComponent cannot be used directly to parse query parameters"
      const cmdArgs =
        getUrlParamValue(
          'arg',
          decodeURIComponent(action.url.replace(/\+/g, ' '))
        ) || []
      const fullCommand = validCommandTypes[commandType](cmdArgs)

      // Play command is considered safe and can run automatically
      // When running the explicit command, also set flag to skip any implicit init commands

      if (['play', 'guide'].includes(commandType)) {
        return of(executeCommand(fullCommand, { source: commandSources.url }), {
          type: DISABLE_IMPLICIT_INIT_COMMANDS
        })
      }

      return of(setContent(fullCommand))
    }),
    catchError(error => {
      console.error('[Editor] populateEditorFromUrlEpic error:', error)
      return EMPTY
    })
  )
}

export const initializeCypherEditorEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = (action$, state$) => {
  return action$.pipe(
    ofType(APP_START),
    take(1),
    withLatestFrom(state$),
    tap(([, state]) => {
      const theme = getTheme(state)
      const monacoTheme = theme === 'dark' ? 'dark' : 'light'
      initalizeCypherSupport(undefined, monacoTheme)
      setupAutocomplete({
        consoleCommands
      })
    }),
    mapTo(cypherEditorReady()),
    catchError(error => {
      console.error('[Editor] initializeCypherEditorEpic error:', error)
      return EMPTY
    })
  )
}
interface SchemaSourceData {
  functions: GlobalState['meta']['functions']
  labels: GlobalState['meta']['labels']
  procedures: GlobalState['meta']['procedures']
  properties: GlobalState['meta']['properties']
  relationshipTypes: GlobalState['meta']['relationshipTypes']
  params: GlobalState['params']
}

const areSchemaSourcesEqual = (
  prev: SchemaSourceData,
  curr: SchemaSourceData
): boolean =>
  prev.functions === curr.functions &&
  prev.labels === curr.labels &&
  prev.procedures === curr.procedures &&
  prev.properties === curr.properties &&
  prev.relationshipTypes === curr.relationshipTypes &&
  prev.params === curr.params

// ReplaySubject to capture CYPHER_EDITOR_READY event
// Must be module-level so subscription starts before any action is dispatched
let editorReadySubject = new ReplaySubject<void>(1)
let isEditorReadySubscribed = false

/**
 * Reset the editor ready state.
 * Useful for testing to ensure clean state between test runs.
 */
export function resetEditorReadyState(): void {
  editorReadySubject = new ReplaySubject<void>(1)
  isEditorReadySubscribed = false
}

// Debug logging for schema updates (can be toggled via window.__CYPHER_EDITOR_DEBUG__)
const isDebugEnabled = () =>
  typeof window !== 'undefined' &&
  (window as any).__CYPHER_EDITOR_DEBUG__ === true

export const updateEditorSupportSchemaEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = (action$, state$) => {
  // Subscribe to CYPHER_EDITOR_READY once, immediately when epic initializes
  // This ensures we capture the event even if it fires before DB_META_DONE
  if (!isEditorReadySubscribed) {
    const timestamp = new Date().toISOString().split('T')[1]
    isEditorReadySubscribed = true
    action$.pipe(ofType(CYPHER_EDITOR_READY), take(1)).subscribe(() => {
      if (isDebugEnabled()) {
        console.log(
          `[Cypher Editor ${timestamp}] ✓ Editor ready, accepting schema updates`
        )
      }
      editorReadySubject.next()
    })
  }

  return action$.pipe(
    filter(isOfType([DB_META_DONE, LABELS_LOADED, UPDATE_PARAMS])),
    tap(action => {
      if (isDebugEnabled()) {
        const timestamp = new Date().toISOString().split('T')[1]
        console.log(
          `[Cypher Editor ${timestamp}] Received ${action.type}, waiting for editor...`
        )
      }
    }),
    // Delay each schema update until the editor is ready
    // Events arriving before CYPHER_EDITOR_READY are buffered and processed when it fires
    delayWhen<AnyAction>(() => editorReadySubject.pipe(take(1))),
    tap(() => {
      if (isDebugEnabled()) {
        const timestamp = new Date().toISOString().split('T')[1]
        console.log(
          `[Cypher Editor ${timestamp}] Editor ready, processing schema update...`
        )
      }
    }),
    withLatestFrom(state$),
    map(([, state]) => ({
      functions: state.meta.functions,
      labels: state.meta.labels,
      procedures: state.meta.procedures,
      properties: state.meta.properties,
      relationshipTypes: state.meta.relationshipTypes,
      params: state.params
    })),
    distinctUntilChanged(areSchemaSourcesEqual),
    mergeMap(schemaData => {
      if (isDebugEnabled()) {
        const timestamp = new Date().toISOString().split('T')[1]
        console.log(`[Cypher Editor ${timestamp}] Schema update:`, {
          labels: schemaData.labels.length,
          relationshipTypes: schemaData.relationshipTypes.length,
          properties: schemaData.properties.length,
          functions: schemaData.functions.length,
          procedures: schemaData.procedures.length,
          params: Object.keys(schemaData.params).length
        })
      }
      setupAutocomplete({
        consoleCommands,
        functions: schemaData.functions.map(toFunction),
        labels: schemaData.labels.map(toLabel),
        parameters: Object.keys(schemaData.params),
        procedures: schemaData.procedures.map(toProcedure),
        propertyKeys: schemaData.properties,
        relationshipTypes: schemaData.relationshipTypes.map(toRelationshipType)
      })
      if (isDebugEnabled()) {
        const timestamp = new Date().toISOString().split('T')[1]
        console.log(
          `[Cypher Editor ${timestamp}] ✓ Autocomplete schema updated`
        )
      }
      return EMPTY
    }),
    catchError(error => {
      const timestamp = new Date().toISOString().split('T')[1]
      console.error(
        `[Editor ${timestamp}] updateEditorSupportSchemaEpic error:`,
        error
      )
      return EMPTY
    })
  )
}
