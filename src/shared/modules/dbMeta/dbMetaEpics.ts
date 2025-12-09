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
import { assign, reduce } from 'lodash-es'
import { AnyAction } from 'redux'
import { Epic, ofType } from 'redux-observable'
import { of, from, timer, merge } from 'rxjs'
import {
  map,
  mergeMap,
  filter,
  tap,
  catchError,
  throttle,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators'

import {
  USER_CAPABILITIES,
  hasClientConfig,
  setClientConfig,
  updateUserCapability
} from '../features/featuresDuck'
import { getDbClusterRole } from '../features/versionedFeatures'
import {
  update,
  updateServerInfo,
  updateSettings,
  CLEAR_META,
  DB_META_DONE,
  FORCE_FETCH,
  SYSTEM_DB,
  metaTypesQuery,
  serverInfoQuery,
  VERSION_FOR_CLUSTER_ROLE_IN_SHOW_DB,
  isOnCluster,
  updateCountAutomaticRefresh,
  getCountAutomaticRefreshEnabled,
  DB_META_FORCE_COUNT,
  DB_META_COUNT_DONE,
  metaCountQuery,
  trialStatusQuery,
  updateTrialStatus,
  oldTrialStatusQuery,
  updateTrialStatusOld,
  isEnterprise,
  SERVER_VERSION_READ,
  supportsMultiDb
} from './dbMetaDuck'
import {
  ClientSettings,
  initialClientSettings,
  Database,
  findDatabaseByNameOrAlias,
  getDatabases,
  getSemanticVersion,
  shouldRetainEditorHistory
} from './dbMetaDuck'
import bolt from 'services/bolt/bolt'
import { isConfigValFalsy, isConfigValTruthy } from 'services/bolt/boltHelpers'
import {
  commandSources,
  executeCommand
} from 'shared/modules/commands/commandsDuck'
import {
  CONNECTED_STATE,
  CONNECTION_SUCCESS,
  DISCONNECTION_SUCCESS,
  LOST_CONNECTION,
  SILENT_DISCONNECT,
  UPDATE_CONNECTION_STATE,
  getActiveConnectionData,
  getLastUseDb,
  getUseDb,
  onLostConnection,
  setAuthEnabled,
  setRetainCredentials,
  updateConnection,
  useDb
} from 'shared/modules/connections/connectionsDuck'
import { clearHistory } from 'shared/modules/history/historyDuck'
import { backgroundTxMetadata } from 'shared/services/bolt/txMetadata'
import {
  getListFunctionQuery,
  getListProcedureQuery
} from '../cypher/functionsAndProceduresHelper'
import { isInt, Record, ResultSummary } from 'neo4j-driver'
import semver, { gte, SemVer } from 'semver'
import { triggerCredentialsTimeout } from '../credentialsPolicy/credentialsPolicyDuck'
import {
  isSystemOrCompositeDb,
  getCurrentDatabase
} from 'shared/utils/selectors'
import { isBoltConnectionErrorCode } from 'services/bolt/boltConnectionErrors'
import { trackPageLoad } from '../preview/previewDuck'
import { GlobalState } from 'shared/globalState'

// Helper type for store-like object used in async functions
type StoreProxy = {
  getState: () => GlobalState
  dispatch: (action: AnyAction) => void
}

function handleConnectionError(dispatch: (action: AnyAction) => void, e: any) {
  if (!e.code || isBoltConnectionErrorCode(e.code)) {
    onLostConnection(dispatch)(e)
  }
}

async function databaseList(storeProxy: StoreProxy) {
  try {
    const hasMultidb = supportsMultiDb(storeProxy.getState())
    if (!hasMultidb) {
      return
    }

    const res = await bolt.backgroundWorkerlessRoutedRead(
      'SHOW DATABASES',
      {
        useDb: SYSTEM_DB
      },
      storeProxy
    )

    if (!res) return

    const databases = res.records.map((record: any) => ({
      ...reduce(
        record.keys,
        (agg, key) => assign(agg, { [key]: record.get(key) }),
        {}
      ),

      status: record.get('currentStatus')
    }))

    storeProxy.dispatch(update({ databases }))
  } catch {}
}

async function getLabelsAndTypes(storeProxy: StoreProxy) {
  const db = getCurrentDatabase(storeProxy.getState())

  // System or composite db, do nothing
  if (db && isSystemOrCompositeDb(db)) {
    return
  }

  // Not system db, try and fetch meta data
  try {
    const res = await bolt.backgroundWorkerlessRoutedRead(
      metaTypesQuery,
      {
        useDb: db?.name
      },
      storeProxy
    )
    if (res && res.records && res.records.length !== 0) {
      const [rawLabels, rawRelTypes, rawProperties] = res.records.map(
        (r: Record) => r.get(0).data
      )

      const compareMetaItems = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0)
      const labels = rawLabels.sort(compareMetaItems)
      const relationshipTypes = rawRelTypes.sort(compareMetaItems)
      const properties = rawProperties.sort(compareMetaItems)

      storeProxy.dispatch(
        update({
          labels,
          properties,
          relationshipTypes
        })
      )
    }
  } catch {}
}

async function getNodeAndRelationshipCounts(
  storeProxy: StoreProxy
): Promise<
  { requestSucceeded: false } | { requestSucceeded: true; timeTaken: number }
> {
  const db = getCurrentDatabase(storeProxy.getState())

  // System or composite db, do nothing
  if (db && isSystemOrCompositeDb(db)) {
    return { requestSucceeded: false }
  }

  // Not system db, try and fetch meta data
  try {
    const res = await bolt.backgroundWorkerlessRoutedRead(
      metaCountQuery,
      {
        useDb: db?.name
      },
      storeProxy
    )
    if (res && res.records && res.records.length !== 0) {
      const [rawNodeCount, rawRelationshipCount] = res.records.map(
        (r: Record) => r.get(0).data
      )

      const neo4jIntegerToNumber = (r: any) =>
        isInt(r) ? r.toNumber() || 0 : r || 0

      const nodes = neo4jIntegerToNumber(rawNodeCount)
      const relationships = neo4jIntegerToNumber(rawRelationshipCount)
      storeProxy.dispatch(
        update({
          nodes,
          relationships
        })
      )
      const summary = res.summary as ResultSummary
      return {
        requestSucceeded: true,
        timeTaken:
          summary.resultAvailableAfter.toNumber() +
          summary.resultConsumedAfter.toNumber()
      }
    }
  } catch {}
  return { requestSucceeded: false }
}

async function getFunctionsAndProcedures(storeProxy: StoreProxy) {
  const version = getSemanticVersion(storeProxy.getState())
  try {
    const useDbValue = supportsMultiDb(storeProxy.getState())
      ? SYSTEM_DB
      : undefined
    const procedurePromise = bolt.backgroundWorkerlessRoutedRead(
      getListProcedureQuery(version),
      { useDb: useDbValue },
      storeProxy
    )
    const functionPromise = bolt.backgroundWorkerlessRoutedRead(
      getListFunctionQuery(version),
      { useDb: useDbValue },
      storeProxy
    )
    const [procedures, functions] = await Promise.all([
      procedurePromise,
      functionPromise
    ])

    storeProxy.dispatch(
      update({
        procedures: procedures.records.map(p => p.toObject()),
        functions: functions.records.map(f => f.toObject())
      })
    )
  } catch {}
}

async function clusterRole(storeProxy: StoreProxy) {
  if (!isOnCluster(storeProxy.getState())) {
    return
  }

  const version = getSemanticVersion(storeProxy.getState())
  if (version && gte(version, VERSION_FOR_CLUSTER_ROLE_IN_SHOW_DB)) {
    // No need to query for the cluster role anymore since it's available in the data from SHOW DATABASES
    return
  }

  try {
    const res = await bolt.directTransaction(
      getDbClusterRole(storeProxy.getState()),
      {},
      backgroundTxMetadata
    )
    if (!res) return

    const role = res.records[0].get(0)
    storeProxy.dispatch(update({ role }))
  } catch (e) {
    handleConnectionError(storeProxy.dispatch, e)
  }
}

async function fetchServerInfo(storeProxy: StoreProxy) {
  try {
    const serverInfo = await bolt.backgroundWorkerlessRoutedRead(
      serverInfoQuery,
      // We use the bolt method for multi db support, since don't have the version in redux yet
      { useDb: (await bolt.hasMultiDbSupport()) ? SYSTEM_DB : undefined },
      storeProxy
    )
    storeProxy.dispatch(updateServerInfo(serverInfo))
  } catch {}
}

async function fetchTrialStatus(storeProxy: StoreProxy) {
  const version = getSemanticVersion(storeProxy.getState())
  const enterprise = isEnterprise(storeProxy.getState())

  const VERSION_FOR_TRIAL_STATUS = '5.7.0'
  const VERSION_FOR_TRIAL_STATUS_OLD = '5.3.0'

  if (version && enterprise) {
    if (gte(version, VERSION_FOR_TRIAL_STATUS)) {
      try {
        const trialStatus = await bolt.backgroundWorkerlessRoutedRead(
          trialStatusQuery,
          // System database is available from v4
          { useDb: SYSTEM_DB },
          storeProxy
        )
        storeProxy.dispatch(updateTrialStatus(trialStatus))
      } catch {}
    } else if (gte(version, VERSION_FOR_TRIAL_STATUS_OLD)) {
      try {
        const oldTrialStatus = await bolt.backgroundWorkerlessRoutedRead(
          oldTrialStatusQuery,
          { useDb: SYSTEM_DB },
          storeProxy
        )
        storeProxy.dispatch(updateTrialStatusOld(oldTrialStatus))
      } catch {}
    }
  }
}

const switchToRequestedDb = (storeProxy: StoreProxy) => {
  if (getUseDb(storeProxy.getState())) return

  const databases = getDatabases(storeProxy.getState())
  const activeConnection = getActiveConnectionData(storeProxy.getState())
  const requestedUseDb = activeConnection?.requestedUseDb

  const switchToLastUsedOrDefaultDb = () => {
    const lastUsedDb = getLastUseDb(storeProxy.getState())
    if (
      lastUsedDb &&
      findDatabaseByNameOrAlias(storeProxy.getState(), lastUsedDb)
    ) {
      storeProxy.dispatch(useDb(lastUsedDb))
    } else {
      const homeDb = databases.find(db => db.home)
      if (homeDb) {
        storeProxy.dispatch(useDb(homeDb.name))
      } else {
        const defaultDb = databases.find(db => db.default)
        if (defaultDb) {
          storeProxy.dispatch(useDb(defaultDb.name))
        } else {
          const systemDb = databases.find(db => db.name === SYSTEM_DB)
          if (systemDb) {
            storeProxy.dispatch(useDb(systemDb.name))
          } else {
            if (databases.length > 0) {
              storeProxy.dispatch(useDb(databases[0].name))
            }
          }
        }
      }
    }
  }

  if (activeConnection && requestedUseDb) {
    const wantedDb = databases.find(
      ({ name }: Database) =>
        name.toLowerCase() === requestedUseDb.toLowerCase()
    )
    storeProxy.dispatch(
      updateConnection({
        id: activeConnection.id,
        requestedUseDb: ''
      })
    )
    if (wantedDb) {
      storeProxy.dispatch(useDb(wantedDb.name))
      // update labels and such for new db
      getLabelsAndTypes(storeProxy)
    } else {
      // this will show the db not found frame
      storeProxy.dispatch(
        executeCommand(`:use ${requestedUseDb}`, {
          source: commandSources.auto
        })
      )
      switchToLastUsedOrDefaultDb()
    }
  } else {
    switchToLastUsedOrDefaultDb()
  }
}

async function pollDbMeta(storeProxy: StoreProxy) {
  try {
    await bolt.quickVerifyConnectivity()
  } catch (e) {
    onLostConnection(storeProxy.dispatch)(e)
    return
  }

  // Cluster setups where the default database is unavailable,
  // get labels and types takes a long time to finish and it shouldn't
  // be blocking the rest of the bootup process, so we don't await the promise
  getLabelsAndTypes(storeProxy)

  await Promise.all([
    getFunctionsAndProcedures(storeProxy),
    clusterRole(storeProxy),
    databaseList(storeProxy)
  ])
}

export const dbMetaEpic: Epic<AnyAction, AnyAction, GlobalState, StoreProxy> = (
  action$,
  state$,
  { dispatch }
) => {
  const createStoreProxy = (): StoreProxy => ({
    getState: () => state$.value,
    dispatch
  })

  const disconnectActions$ = merge(
    action$.pipe(ofType(LOST_CONNECTION)),
    action$.pipe(ofType(DISCONNECTION_SUCCESS)),
    action$.pipe(ofType(SILENT_DISCONNECT))
  )

  const connectionTrigger$ = merge(
    action$.pipe(
      ofType(UPDATE_CONNECTION_STATE),
      filter((action: AnyAction) => action.state === CONNECTED_STATE)
    ),
    action$.pipe(ofType(CONNECTION_SUCCESS))
  )

  return connectionTrigger$.pipe(
    mergeMap(() => {
      const storeProxy = createStoreProxy()

      return from(fetchServerInfo(storeProxy)).pipe(
        tap(() => {
          fetchTrialStatus(createStoreProxy())
        }),
        mergeMap(() => {
          // Emit SERVER_VERSION_READ first, then start polling
          const pollingStream$ = merge(
            timer(1, 20000),
            action$.pipe(ofType(FORCE_FETCH))
          ).pipe(
            throttle(() => action$.pipe(ofType(DB_META_DONE))),
            mergeMap(() => from(pollDbMeta(createStoreProxy()))),
            takeUntil(disconnectActions$),
            tap(() => switchToRequestedDb(createStoreProxy())),
            map(() => ({ type: DB_META_DONE }))
          )

          return merge(
            of({ type: SERVER_VERSION_READ } as AnyAction),
            pollingStream$
          )
        })
      )
    })
  )
}

export const dbCountEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState,
  StoreProxy
> = (action$, state$, { dispatch }) => {
  const createStoreProxy = (): StoreProxy => ({
    getState: () => state$.value,
    dispatch
  })

  return merge(
    action$.pipe(
      ofType(DB_META_DONE),
      withLatestFrom(state$),
      filter(([, state]) => getCountAutomaticRefreshEnabled(state)),
      map(([action]) => action)
    ),
    action$.pipe(ofType(DB_META_FORCE_COUNT))
  ).pipe(
    throttle(() => action$.pipe(ofType(DB_META_COUNT_DONE))),
    mergeMap(() => {
      const storeProxy = createStoreProxy()

      return from(
        (async () => {
          const actions: AnyAction[] = []

          actions.push(updateCountAutomaticRefresh({ loading: true }))

          const res = await getNodeAndRelationshipCounts(storeProxy)

          const notAlreadyDisabled = getCountAutomaticRefreshEnabled(
            state$.value
          )
          if (
            res.requestSucceeded &&
            res.timeTaken > 1000 &&
            notAlreadyDisabled
          ) {
            actions.push(updateCountAutomaticRefresh({ enabled: false }))
          }

          actions.push(updateCountAutomaticRefresh({ loading: false }))
          actions.push({ type: DB_META_COUNT_DONE })

          return actions
        })()
      ).pipe(mergeMap(actions => of(...actions)))
    })
  )
}

export const serverConfigEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState,
  StoreProxy
> = (action$, state$, { dispatch }) => {
  const createStoreProxy = (): StoreProxy => ({
    getState: () => state$.value,
    dispatch
  })

  return action$.pipe(
    ofType(SERVER_VERSION_READ),
    mergeMap(() => {
      const storeProxy = createStoreProxy()

      return from(
        new Promise<AnyAction[]>(async (resolve, reject) => {
          const useDbValue = supportsMultiDb(state$.value)
            ? SYSTEM_DB
            : undefined

          const actions: AnyAction[] = []

          bolt
            .backgroundWorkerlessRoutedRead(
              `CALL ${
                hasClientConfig(state$.value) !== false
                  ? 'dbms.clientConfig()'
                  : 'dbms.listConfig()'
              }`,
              { useDb: useDbValue },
              storeProxy
            )
            .then((r: any) => {
              // This is not set yet
              if (hasClientConfig(state$.value) === null) {
                actions.push(setClientConfig(true))
              }
              resolve([...actions, { __result: r }] as any)
            })
            .catch((e: any) => {
              // Try older procedure if the new one doesn't exist
              if (e.code === 'Neo.ClientError.Procedure.ProcedureNotFound') {
                // Store that dbms.clientConfig isn't available
                actions.push(setClientConfig(false))

                bolt
                  .backgroundWorkerlessRoutedRead(
                    `CALL dbms.listConfig()`,
                    {
                      useDb: useDbValue
                    },
                    storeProxy
                  )
                  .then(r => resolve([...actions, { __result: r }] as any))
                  .catch(reject)
              } else {
                reject(e)
              }
            })
        })
      ).pipe(
        catchError(() =>
          of([
            updateUserCapability(USER_CAPABILITIES.serverConfigReadable, false),
            { __result: null }
          ] as any)
        ),
        mergeMap((actionsWithResult: any[]) => {
          const resultAction = actionsWithResult.find(a => '__result' in a)
          const otherActions = actionsWithResult.filter(a => !('__result' in a))
          const res = resultAction?.__result

          const finalActions: AnyAction[] = [...otherActions]

          if (res) {
            const neo4jVersion = getSemanticVersion(state$.value)

            const rawSettings = res.records.reduce((all: any, record: any) => {
              const name = record.get('name')
              all[name] = record.get('value')
              return all
            }, {})

            const settings: ClientSettings = cleanupSettings(
              rawSettings,
              neo4jVersion
            )

            // side-effects converted to actions
            finalActions.push(
              setRetainCredentials(settings.retainConnectionCredentials)
            )
            finalActions.push(setAuthEnabled(settings.authEnabled))

            finalActions.push(
              updateUserCapability(USER_CAPABILITIES.serverConfigReadable, true)
            )
            finalActions.push(updateSettings(settings))

            if (!state$.value.meta.serverConfigDone) {
              // Trigger a credentials timeout since the settings have just been read from the server for the first time and might be different from the defaults.
              finalActions.push(triggerCredentialsTimeout())
            }

            // Track page load - setTimeout ensures telemetry settings have been propagated to the App
            // We emit trackPageLoad as part of the action stream (the setTimeout behavior is preserved
            // because actions are processed asynchronously)
            finalActions.push(trackPageLoad())
          }

          finalActions.push(update({ serverConfigDone: true }))
          finalActions.push({ type: 'SERVER_CONFIG_DONE' })

          return of(...finalActions)
        })
      )
    })
  )
}

export const cleanupSettings = (
  rawSettings: any,
  neo4jVersion: SemVer | null
) => {
  const settings: ClientSettings = {
    allowOutgoingConnections: !isConfigValFalsy(
      rawSettings['browser.allow_outgoing_connections']
    ), // default true
    credentialTimeout: rawSettings['browser.credential_timeout'] || 0,
    postConnectCmd: rawSettings['browser.post_connect_cmd'] || '',
    remoteContentHostnameAllowlist:
      rawSettings['browser.remote_content_hostname_whitelist'] ||
      initialClientSettings.remoteContentHostnameAllowlist,
    retainConnectionCredentials: !isConfigValFalsy(
      rawSettings['browser.retain_connection_credentials']
    ), // default true
    retainEditorHistory: !isConfigValFalsy(
      rawSettings['browser.retain_editor_history']
    ), // default true
    // Info: clients.allow_telemetry in versions < 5.0, client.allow_telemetry in versions >= 5.0
    allowTelemetry: !(
      isConfigValFalsy(rawSettings['clients.allow_telemetry']) ||
      isConfigValFalsy(rawSettings['client.allow_telemetry'])
    ), // default true
    authEnabled: !isConfigValFalsy(rawSettings['dbms.security.auth_enabled']), // default true
    // Info: in versions < 5.0 exists and defaults to false, in versions >= 5.0 is removed and always true
    metricsNamespacesEnabled:
      neo4jVersion && semver.satisfies(neo4jVersion, '<5.0.0')
        ? isConfigValTruthy(rawSettings['metrics.namespaces.enabled'])
        : true,
    metricsPrefix:
      rawSettings['metrics.prefix'] ??
      rawSettings['server.metrics.prefix'] ??
      initialClientSettings.metricsPrefix
  }

  return settings
}

export const clearMetaOnDisconnectEpic: Epic<
  AnyAction,
  AnyAction,
  GlobalState
> = (action$, state$) =>
  merge(
    action$.pipe(ofType(DISCONNECTION_SUCCESS)),
    action$.pipe(ofType(SILENT_DISCONNECT))
  ).pipe(
    withLatestFrom(state$),
    mergeMap(([, state]) => {
      if (!shouldRetainEditorHistory(state)) {
        return of(clearHistory(), { type: CLEAR_META })
      }
      return of({ type: CLEAR_META })
    })
  )
