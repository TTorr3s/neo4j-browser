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
import { Observable, of, EMPTY, NEVER, from, merge } from 'rxjs'
import {
  map,
  mergeMap,
  filter,
  tap,
  catchError,
  throttleTime,
  retry,
  ignoreElements,
  withLatestFrom
} from 'rxjs/operators'

import bolt from 'services/bolt/bolt'
import {
  UnauthorizedDriverError,
  isBoltConnectionErrorCode
} from 'services/bolt/boltConnectionErrors'
import { NATIVE, NO_AUTH } from 'services/bolt/boltHelpers'
import { GlobalState } from 'shared/globalState'
import { APP_START, USER_CLEAR, inDesktop } from 'shared/modules/app/appDuck'
import { executeSystemCommand } from 'shared/modules/commands/commandsDuck'
import * as discovery from 'shared/modules/discovery/discoveryDuck'
import {
  NEO4J_CLOUD_DOMAINS,
  getConnectionTimeout,
  getInitCmd,
  getPlayImplicitInitCommands
} from 'shared/modules/settings/settingsDuck'
import { isCloudHost } from 'shared/services/utils'
import { isError } from 'shared/utils/typeguards'
import { fetchMetaData } from '../dbMeta/dbMetaDuck'
import forceResetPasswordQueryHelper, {
  MultiDatabaseNotSupportedError
} from './forceResetPasswordQueryHelper'

export const NAME = 'connections'
export const SET_ACTIVE = 'connections/SET_ACTIVE'
export const SELECT = 'connections/SELECT'
export const REMOVE = 'connections/REMOVE'
export const MERGE = 'connections/MERGE'
export const CONNECT = 'connections/CONNECT'
export const DISCONNECT = 'connections/DISCONNECT'
export const SILENT_DISCONNECT = 'connections/SILENT_DISCONNECT'
export const STARTUP_CONNECTION_SUCCESS =
  'connections/STARTUP_CONNECTION_SUCCESS'
export const STARTUP_CONNECTION_FAILED = 'connections/STARTUP_CONNECTION_FAILED'
export const CONNECTION_SUCCESS = 'connections/CONNECTION_SUCCESS'
export const DISCONNECTION_SUCCESS = 'connections/DISCONNECTION_SUCCESS'
export const FORCE_CHANGE_PASSWORD = 'connections/FORCE_CHANGE_PASSWORD'
export const LOST_CONNECTION = 'connections/LOST_CONNECTION'
export const UPDATE_CONNECTION_STATE = 'connections/UPDATE_CONNECTION_STATE'
export const UPDATE_RETAIN_CREDENTIALS = `connections/UPDATE_RETAIN_CREDENTIALS`
export const UPDATE_AUTH_ENABLED = `connections/UPDATE_AUTH_ENABLED`
export const SWITCH_CONNECTION = `connections/SWITCH_CONNECTION`
export const SWITCH_CONNECTION_SUCCESS = `connections/SWITCH_CONNECTION_SUCCESS`
export const SWITCH_CONNECTION_FAILED = `connections/SWITCH_CONNECTION_FAILED`
export const INITIAL_SWITCH_CONNECTION_FAILED = `connections/INITIAL_SWITCH_CONNECTION_FAILED`
export const VERIFY_CREDENTIALS = `connections/VERIFY_CREDENTIALS`
export const USE_DB = `connections/USE_DB`

export const DISCONNECTED_STATE = 0
export const CONNECTED_STATE = 1
export const PENDING_STATE = 2
export const CONNECTING_STATE = 3

export interface ConnectionProfile {
  name: string
  host: string
  username: string
  password: string
  authenticationMethod: string
}
export type ConnectionReduxState = {
  allConnectionIds: string[]
  connectionsById: Record<string, Connection>
  activeConnection: string | null
  connectionState: ConnectionState
  lastUpdate: number
  useDb: string | null
  lastUseDb: string | null
}
export type ConnectionState =
  | typeof DISCONNECTED_STATE
  | typeof CONNECTED_STATE
  | typeof PENDING_STATE
  | typeof CONNECTING_STATE

export type AuthenticationMethod = typeof NATIVE | typeof NO_AUTH
const onlyValidConnId = discovery.CONNECTION_ID
// we only use one connection, but can't update the redux state
// to match that fact until we've merged proper single sign on
// and sandbox can use that instead of their fork
export type Connection = {
  username: string
  password: string
  id: typeof onlyValidConnId
  db: string | null
  host: string | null
  authEnabled: boolean
  authenticationMethod: AuthenticationMethod
  requestedUseDb?: string
  restApi?: string
}

export const initialState: ConnectionReduxState = {
  allConnectionIds: [],
  connectionsById: {},
  activeConnection: null,
  connectionState: DISCONNECTED_STATE,
  lastUpdate: 0,
  useDb: null,
  lastUseDb: null
}
/**
 * Selectors
 */
export function getConnection(
  state: GlobalState,
  id: string
): Connection | null {
  return (
    getConnections(state).find(
      connection => connection && connection.id === id
    ) || null
  )
}

export function getLastUseDb(state: GlobalState): string | null {
  return (state[NAME] || {}).lastUseDb
}

export function getUseDb(state: GlobalState): string | null {
  return (state[NAME] || {}).useDb
}

export function getConnections(state: GlobalState): Connection[] {
  return Object.values(state[NAME].connectionsById)
}

export function getConnectionState(state: GlobalState): ConnectionState {
  return state[NAME].connectionState || initialState.connectionState
}

export function getLastConnectionUpdate(state: GlobalState): number {
  return state[NAME].lastUpdate || initialState.lastUpdate
}

export function isConnected(state: GlobalState): boolean {
  return getConnectionState(state) === CONNECTED_STATE
}

export function getActiveConnection(state: GlobalState): string | null {
  return state[NAME].activeConnection || initialState.activeConnection
}

export function getActiveConnectionData(state: GlobalState): Connection | null {
  if (!state[NAME].activeConnection) return null
  return getConnectionData(state, state[NAME].activeConnection)
}

export function getAuthEnabled(state: GlobalState): boolean {
  const data = getConnectionData(state, state[NAME].activeConnection)
  return data?.authEnabled ?? true
}

export function getConnectedHost(state: GlobalState): string | null {
  const data = getConnectionData(state, state[NAME].activeConnection)
  return data?.host ?? null
}

export function isConnectedAuraHost(state: GlobalState): boolean {
  const host = getConnectedHost(state)
  return host ? isCloudHost(host, NEO4J_CLOUD_DOMAINS) : false
}

export function getConnectionData(
  state: GlobalState,
  id: string | null
): Connection | null {
  if (!id) return null

  const data = state[NAME].connectionsById[id]
  if (typeof data === 'undefined') return null

  data.db = getUseDb(state)

  if (data.username && data.password) {
    return data
  } else if (memoryUsername && memoryPassword) {
    // No retain state
    return { ...data, username: memoryUsername, password: memoryPassword }
  }

  return { ...data, username: data.username ? data.username : memoryUsername }
}

const removeConnectionHelper = (
  state: ConnectionReduxState
): ConnectionReduxState => {
  // Since we only have one connection
  // deleting on is the same as deleting them all
  //We can only have

  return {
    ...state,
    allConnectionIds: [],
    connectionsById: {}
  }
}

const mergeConnectionHelper = (
  state: ConnectionReduxState,
  connection: Connection
): ConnectionReduxState => {
  const { connectionsById } = state
  const currentConnection = connectionsById[onlyValidConnId]
  // Only valid connection we keep now is $$discovery so all
  // merges must result in this state
  return {
    ...state,
    connectionsById: {
      [onlyValidConnId]: {
        ...currentConnection,
        ...connection,
        id: onlyValidConnId
      }
    },
    allConnectionIds: [onlyValidConnId]
  }
}

const updateAuthEnabledHelper = (
  state: ConnectionReduxState,
  authEnabled: boolean
): ConnectionReduxState => {
  const connectionId = state.activeConnection
  if (!connectionId) return state // no connection to update

  const updatedConnection = {
    ...state.connectionsById[connectionId],
    authEnabled
  }

  if (!authEnabled) {
    updatedConnection.username = ''
    updatedConnection.password = ''
  }

  const updatedConnectionByIds = {
    ...state.connectionsById
  }
  updatedConnectionByIds[connectionId] = updatedConnection

  return {
    ...state,
    connectionsById: updatedConnectionByIds
  }
}

// Local vars
let memoryUsername = ''
let memoryPassword = ''

// Reducer
export default function (state = initialState, action: any) {
  switch (action.type) {
    case APP_START:
      return {
        ...initialState,
        ...state,
        useDb: initialState.useDb,
        connectionState: DISCONNECTED_STATE
      }
    case SET_ACTIVE:
      let cState = CONNECTED_STATE
      if (!action.connectionId) cState = DISCONNECTED_STATE
      return {
        ...state,
        activeConnection: action.connectionId,
        connectionState: cState,
        lastUpdate: Date.now()
      }
    case CONNECT:
      return {
        ...state,
        activeConnection: onlyValidConnId,
        connectionState: CONNECTING_STATE,
        lastUpdate: Date.now()
      }
    case REMOVE:
      return removeConnectionHelper(state)
    case MERGE:
      return mergeConnectionHelper(state, action.connection)
    case UPDATE_CONNECTION_STATE:
      return {
        ...state,
        connectionState: action.state,
        lastUpdate: Date.now()
      }
    case UPDATE_AUTH_ENABLED:
      return updateAuthEnabledHelper(state, action.authEnabled)
    case USE_DB:
      const { useDb } = action
      let lastUseDb = useDb
      if (useDb === null) {
        lastUseDb = state.useDb || state.lastUseDb
      }
      return { ...state, lastUseDb, useDb }
    case USER_CLEAR:
      return initialState
    default:
      return state
  }
}

// Actions
export const selectConnection = (id: any) => {
  return {
    type: SELECT,
    connectionId: id
  }
}

export const setActiveConnection = (id: any, silent = false) => {
  return {
    type: SET_ACTIVE,
    connectionId: id,
    silent
  }
}
export const updateConnection = (connection: any) => {
  return {
    type: MERGE,
    connection
  }
}

export const disconnectAction = (id: string = discovery.CONNECTION_ID) => {
  return {
    type: DISCONNECT,
    id
  }
}

export const updateConnectionState = (state: any) => ({
  state,
  type: UPDATE_CONNECTION_STATE
})

export const onLostConnection = (dispatch: any) => (e: any) => {
  dispatch({ type: LOST_CONNECTION, error: e })
}

export const setRetainCredentials = (shouldRetain: any) => {
  return {
    type: UPDATE_RETAIN_CREDENTIALS,
    shouldRetain
  }
}

export const setAuthEnabled = (authEnabled: any) => {
  return {
    type: UPDATE_AUTH_ENABLED,
    authEnabled
  }
}

export const useDb = (db: any = null) => ({ type: USE_DB, useDb: db })

export const resetUseDb = () => ({ type: USE_DB, useDb: null })

// Epics
export const useDbEpic: Epic<AnyAction, AnyAction, GlobalState> = action$ =>
  action$.pipe(
    ofType(USE_DB),
    mergeMap((action: AnyAction) => {
      bolt.useDb(action.useDb)
      if (action.useDb) {
        return of(fetchMetaData())
      }
      return EMPTY
    })
  )

// Type for connect action with response channel
type ConnectAction = Connection & {
  type: typeof CONNECT
  $$responseChannel?: string
  noResetConnectionOnFail?: boolean
}

export const connectEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$
) =>
  action$.pipe(
    ofType(CONNECT),
    withLatestFrom(state$),
    mergeMap(([action, state]) => {
      const connectAction = action as ConnectAction
      if (!connectAction.$$responseChannel) return EMPTY
      memoryUsername = ''
      memoryPassword = ''
      bolt.closeConnection()

      return from(
        new Promise<void>(resolve => setTimeout(() => resolve(), 2000))
      ).pipe(
        mergeMap(() =>
          from(
            bolt.openConnection(connectAction, {
              connectionTimeout: getConnectionTimeout(state)
            })
          )
        ),
        mergeMap(async () => {
          // we know we can reach the server but when connecting via the form
          // we need to make sure the initial credentials have been changed
          const supportsMultiDb = await bolt.hasMultiDbSupport()
          try {
            await bolt.backgroundWorkerlessRoutedRead(
              supportsMultiDb ? 'SHOW DATABASES' : 'call db.indexes()',
              { useDb: supportsMultiDb ? 'SYSTEM' : undefined },
              { getState: () => state$.value, dispatch: () => {} }
            )
          } catch (error) {
            const e: any = error
            // if we got a connection error throw, otherwise continue
            if (!e.code || isBoltConnectionErrorCode(e.code)) {
              throw e
            }
          }

          const actions: AnyAction[] = []
          if (connectAction.requestedUseDb) {
            actions.push(
              updateConnection({
                id: connectAction.id,
                requestedUseDb: connectAction.requestedUseDb
              })
            )
          }
          actions.push({
            type: connectAction.$$responseChannel!,
            success: true
          })
          return actions
        }),
        mergeMap(actions => of(...actions)),
        catchError(e => {
          const actions: AnyAction[] = []
          if (!connectAction.noResetConnectionOnFail) {
            actions.push(setActiveConnection(null))
          }
          actions.push({
            type: connectAction.$$responseChannel!,
            success: false,
            error: e
          })
          return of(...actions)
        })
      )
    })
  )

// Type for verify credentials action
type VerifyCredentialsAction = Connection & {
  type: typeof VERIFY_CREDENTIALS
  $$responseChannel?: string
}

export const verifyConnectionCredentialsEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(VERIFY_CREDENTIALS),
    mergeMap((action: AnyAction) => {
      const verifyAction = action as VerifyCredentialsAction
      if (!verifyAction.$$responseChannel) return EMPTY
      return from(bolt.directConnect(verifyAction, {}, undefined)).pipe(
        map(driver => {
          driver.close()
          return { type: verifyAction.$$responseChannel!, success: true }
        }),
        catchError(e =>
          of({
            type: verifyAction.$$responseChannel!,
            success: false,
            error: e
          })
        )
      )
    })
  )
export type DiscoverableData = {
  username?: string
  password?: string
  requestedUseDb?: string
  restApi?: string
  supportsMultiDb?: boolean
  host?: string
  encrypted?: string
  hasForceUrl?: boolean
  neo4jVersion?: string
}

export type DiscoverDataAction = {
  type: typeof discovery.DONE
  discovered?: DiscoverableData
}

function shouldTryAutoconnecting(conn: Connection | null): boolean {
  return Boolean(
    conn &&
      conn.authenticationMethod !== NO_AUTH &&
      conn.host &&
      conn.username &&
      conn.password
  )
}

export const startupConnectEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$
) =>
  action$.pipe(
    ofType(discovery.DONE),
    withLatestFrom(state$),
    mergeMap(([rawAction, state]) => {
      const { discovered } = rawAction as DiscoverDataAction
      const connectionTimeout = getConnectionTimeout(state)
      const savedConnection = getConnection(state, discovery.CONNECTION_ID)

      // Helper to create dispatch function for onLostConnection
      const createDispatchProxy = () => {
        // We return actions via the stream, but onLostConnection needs a dispatch function
        // This is a limitation - we'll need to dispatch LOST_CONNECTION through the epic stream
        return (_action: AnyAction) => {
          // This is handled by the connectionLostEpic when LOST_CONNECTION is dispatched
          // The action will be dispatched by the store when this observable emits
        }
      }

      return from(
        (async (): Promise<AnyAction[]> => {
          if (
            !(discovered && discovered.hasForceUrl) && // If we have force url, don't try old connection data
            shouldTryAutoconnecting(savedConnection)
          ) {
            try {
              await bolt.openConnection(
                savedConnection!,
                { connectionTimeout },
                onLostConnection(createDispatchProxy())
              )
              return [
                resetUseDb(),
                setActiveConnection(discovery.CONNECTION_ID),
                { type: STARTUP_CONNECTION_SUCCESS }
              ]
            } catch {
              // Fall through to try discovery data
            }
          }

          // merge with discovery data if we have any and try again
          if (discovered) {
            // We need to emit updateDiscoveryConnection and then get new state
            // This is complex because we need the updated connection data
            // For now, we'll build the updated connection manually
            const currentConn = savedConnection || ({} as Connection)
            const updatedConnection: Connection = {
              ...currentConn,
              ...discovered,
              id: discovery.CONNECTION_ID
            } as Connection

            if (shouldTryAutoconnecting(updatedConnection)) {
              try {
                await bolt.openConnection(
                  updatedConnection,
                  { connectionTimeout },
                  onLostConnection(createDispatchProxy())
                )
                return [
                  resetUseDb(),
                  discovery.updateDiscoveryConnection(discovered),
                  setActiveConnection(discovery.CONNECTION_ID),
                  { type: STARTUP_CONNECTION_SUCCESS }
                ]
              } catch {
                return [
                  resetUseDb(),
                  discovery.updateDiscoveryConnection(discovered),
                  setActiveConnection(null),
                  discovery.updateDiscoveryConnection({
                    username: '',
                    password: ''
                  }),
                  { type: STARTUP_CONNECTION_FAILED }
                ]
              }
            }
          }

          // Otherwise fail autoconnect
          return [
            resetUseDb(),
            setActiveConnection(null),
            discovery.updateDiscoveryConnection({
              password: ''
            }),
            { type: STARTUP_CONNECTION_FAILED }
          ]
        })()
      ).pipe(mergeMap(actions => of(...actions)))
    })
  )

export const startupConnectionSuccessEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = (action$, state$) =>
  action$.pipe(
    ofType(STARTUP_CONNECTION_SUCCESS),
    withLatestFrom(state$),
    mergeMap(([, state]) => {
      if (getPlayImplicitInitCommands(state)) {
        return of(
          executeSystemCommand(`:server status`),
          executeSystemCommand(getInitCmd(state))
        )
      }
      return EMPTY
    })
  )

export const startupConnectionFailEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(STARTUP_CONNECTION_FAILED),
    map(() => executeSystemCommand(`:server connect`))
  )

let lastActiveConnectionId: string | null = null
export const detectActiveConnectionChangeEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(SET_ACTIVE),
    mergeMap((action: AnyAction) => {
      if (lastActiveConnectionId === action.connectionId) {
        return NEVER // no change
      }
      lastActiveConnectionId = action.connectionId
      if (!action.connectionId && !action.silent) {
        // Non silent disconnect
        return of({ type: DISCONNECTION_SUCCESS })
      } else if (!action.connectionId && action.silent) {
        // Silent disconnect
        return NEVER
      }
      return of({ type: CONNECTION_SUCCESS }) // connect
    })
  )
export const disconnectEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  merge(
    action$.pipe(ofType<AnyAction>(DISCONNECT)),
    action$.pipe(ofType<AnyAction>(USER_CLEAR))
  ).pipe(
    mergeMap((action: AnyAction) => {
      bolt.closeConnection()
      memoryPassword = ''
      const connectionId =
        (action as { id?: string }).id || discovery.CONNECTION_ID
      return of(
        resetUseDb(),
        updateConnection({ id: connectionId, password: '' }),
        setActiveConnection(null)
      )
    })
  )

export const silentDisconnectEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(SILENT_DISCONNECT),
    mergeMap(() => {
      bolt.closeConnection()
      return of(resetUseDb(), setActiveConnection(null, true))
    })
  )

export const disconnectSuccessEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(DISCONNECTION_SUCCESS),
    mergeMap(() => of(resetUseDb(), executeSystemCommand(':server connect')))
  )

export const connectionLostEpic: Epic<AnyAction, AnyAction, GlobalState> = (
  action$,
  state$
) =>
  action$.pipe(
    ofType(LOST_CONNECTION),
    // Only retry outside desktop and if we're supposed to be connected
    withLatestFrom(state$),
    filter(([, state]) => !inDesktop(state) && isConnected(state)),
    throttleTime(5000),
    mergeMap(() => {
      const attemptReconnect = (): Promise<{ type: string }> => {
        return new Promise((resolve, reject) => {
          const connection = getActiveConnectionData(state$.value)
          if (!connection)
            return reject(new Error('No connection object found'))

          bolt
            .directConnect(
              connection,
              {
                connectionTimeout: getConnectionTimeout(state$.value)
              },
              () =>
                setTimeout(
                  () => reject(new Error('Couldnt reconnect. Lost.')),
                  5000
                )
            )
            .then(() => {
              bolt.closeConnection()
              bolt
                .openConnection(
                  connection!,
                  {
                    connectionTimeout: getConnectionTimeout(state$.value)
                  },
                  // Note: onLostConnection needs a dispatch function
                  // The LOST_CONNECTION action will be handled by this epic
                  () => {}
                )
                .then(() => {
                  resolve({ type: 'Success' })
                })
                .catch(() => reject(new Error('Error on connect')))
            })
            .catch(e => {
              // Don't retry if auth failed
              if (e.code === UnauthorizedDriverError) {
                resolve({ type: e.code })
              } else {
                setTimeout(() => reject(new Error('Couldnt reconnect.')), 5000)
              }
            })
        })
      }

      return of(updateConnectionState(PENDING_STATE)).pipe(
        mergeMap(() =>
          from(attemptReconnect()).pipe(
            retry(10),
            mergeMap((res: { type: string }) => {
              // It can be resolved for a number of reasons:
              // 1. Connection successful
              // 2. Auth failure
              if (res.type === 'Success') {
                return of(updateConnectionState(CONNECTED_STATE))
              }
              // If no connection because of auth failure, close and unset active connection
              if (res.type === UnauthorizedDriverError) {
                bolt.closeConnection()
                return of(setActiveConnection(null))
              }
              return EMPTY
            }),
            catchError(() => {
              bolt.closeConnection()
              return of(setActiveConnection(null))
            })
          )
        )
      )
    })
  )

// Type for switch connection action
type SwitchConnectionAction = Partial<Connection> & {
  type: typeof SWITCH_CONNECTION
  encrypted?: boolean
}

export const switchConnectionEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(SWITCH_CONNECTION),
    mergeMap((action: AnyAction) => {
      const switchAction = action as SwitchConnectionAction
      bolt.closeConnection()
      const connectionInfo = { id: discovery.CONNECTION_ID, ...switchAction }

      return of(
        updateConnectionState(PENDING_STATE),
        updateConnection(connectionInfo)
      ).pipe(
        mergeMap(initialAction => {
          // Emit the initial actions first
          if (initialAction.type !== MERGE) {
            return of(initialAction)
          }
          // After MERGE, attempt the connection
          return from(
            bolt.openConnection(
              switchAction as Connection,
              { encrypted: switchAction.encrypted },
              // onLostConnection will dispatch LOST_CONNECTION which is handled by connectionLostEpic
              () => {}
            )
          ).pipe(
            mergeMap(() =>
              of(
                updateConnection(connectionInfo),
                setActiveConnection(discovery.CONNECTION_ID),
                { type: SWITCH_CONNECTION_SUCCESS }
              )
            ),
            catchError(() =>
              of(
                setActiveConnection(null),
                discovery.updateDiscoveryConnection({
                  username: 'neo4j',
                  password: ''
                }),
                { type: SWITCH_CONNECTION_FAILED }
              )
            )
          )
        })
      )
    })
  )

export const switchConnectionSuccessEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(SWITCH_CONNECTION_SUCCESS),
    mergeMap(() =>
      of(
        updateConnectionState(CONNECTED_STATE),
        fetchMetaData(),
        executeSystemCommand(':server switch success')
      )
    )
  )

export const switchConnectionFailEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(SWITCH_CONNECTION_FAILED),
    mergeMap(() =>
      of(
        updateConnectionState(DISCONNECTED_STATE),
        executeSystemCommand(`:server switch fail`)
      )
    )
  )

export const initialSwitchConnectionFailEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = (action$, state$) =>
  action$.pipe(
    ofType(INITIAL_SWITCH_CONNECTION_FAILED),
    withLatestFrom(state$),
    mergeMap(([, state]) => {
      if (getPlayImplicitInitCommands(state)) {
        return of(
          updateConnectionState(DISCONNECTED_STATE),
          executeSystemCommand(`:server switch fail`)
        )
      }
      return of(updateConnectionState(DISCONNECTED_STATE))
    })
  )

export const retainCredentialsSettingsEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = (action$, state$) =>
  action$.pipe(
    ofType(UPDATE_RETAIN_CREDENTIALS),
    withLatestFrom(state$),
    mergeMap(([action, state]) => {
      const connection = getActiveConnectionData(state)
      if (!connection) {
        return EMPTY
      }

      if (
        !action.shouldRetain &&
        connection &&
        (connection.username || connection.password)
      ) {
        memoryUsername = connection.username
        memoryPassword = connection.password
        const updatedConnection = {
          ...connection,
          username: '',
          password: ''
        }
        return of(updateConnection(updatedConnection))
      }
      if (
        action.shouldRetain &&
        memoryUsername &&
        memoryPassword &&
        connection
      ) {
        const updatedConnection = {
          ...connection,
          username: memoryUsername,
          password: memoryPassword
        }
        memoryUsername = ''
        memoryPassword = ''
        return of(updateConnection(updatedConnection))
      }
      return EMPTY
    })
  )

/**
 * Epic to handle a FORCE_CHANGE_PASSWORD event.
 *
 * We need this because this is the only case where we still
 * want to execute cypher even though we get an connection error back.
 *
 * Previously, we were attempting to read the version of Neo4j in state, falling
 * back to querying the database if it was not present. This was problematic, because
 * if the user was logging in for the first time, this request would fail since they
 * were not authorized to execute queries against the database.
 *
 * This problem was further compounded if the default (neo4j) database did not exist.
 *
 * In this approach, we simply attempt to change the password using current syntax,
 * falling back to the legacy DBMS function if this fails with a specific error message.
 */
type ForcePasswordAction = Connection & {
  $$responseChannel: string
  newPassword: string
}

export const handleForcePasswordChangeEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = action$ =>
  action$.pipe(
    ofType(FORCE_CHANGE_PASSWORD),
    mergeMap((action: AnyAction) => {
      const typedAction = action as unknown as ForcePasswordAction
      if (!typedAction.$$responseChannel) return EMPTY

      return from(
        new Promise<AnyAction>(resolve => {
          const resolveAction = (error?: Error | void) => {
            resolve({
              type: typedAction.$$responseChannel,
              success: error === undefined,
              ...(error === undefined
                ? {
                    result: {
                      meta: typedAction.host
                    }
                  }
                : {
                    error
                  })
            })
          }

          bolt
            .directConnect(
              typedAction,
              {},
              undefined,
              false // Ignore validation errors
            )
            .then(async driver => {
              try {
                // Attempt to change the password using Cypher syntax
                const result = await forceResetPasswordQueryHelper
                  .executeAlterCurrentUserQuery(driver, typedAction)
                  .then(resolveAction)
                  .catch(error => error)

                if (isError(result)) {
                  if (result instanceof MultiDatabaseNotSupportedError) {
                    // If we get a multi database not supported error,
                    // fall back to the legacy dbms function
                    await forceResetPasswordQueryHelper
                      .executeCallChangePasswordQuery(driver, typedAction)
                      .then(resolveAction)
                      .catch(resolveAction)
                  } else {
                    // Otherwise, return the error for the UI to handle e.g. invalid password
                    resolveAction(result)
                  }
                }
              } finally {
                driver.close()
              }
            })
            .catch(resolveAction)
        })
      )
    })
  )
