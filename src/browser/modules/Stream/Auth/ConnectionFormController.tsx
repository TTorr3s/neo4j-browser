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
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  ChangeEvent
} from 'react'
import { useSelector, useDispatch } from 'react-redux'

import ChangePasswordForm from './ChangePasswordForm'
import ConnectForm from './ConnectForm'
import ConnectedView from './ConnectedView'
import { StyledConnectionBody } from './styled'
import { useBus } from 'browser-hooks/useBus'
import { NATIVE, NO_AUTH } from 'services/bolt/boltHelpers'
import {
  generateBoltUrl,
  getScheme,
  isNonSupportedRoutingSchemeError,
  toggleSchemeRouting
} from 'services/boltscheme.utils'
import { getAllowedBoltSchemes } from 'shared/modules/app/appDuck'
import { CLOUD_SCHEMES } from 'shared/modules/app/appDuck'
import { executeSystemCommand } from 'shared/modules/commands/commandsDuck'
import {
  CONNECT,
  ConnectionProfile,
  VERIFY_CREDENTIALS,
  getActiveConnection,
  getActiveConnectionData,
  getConnectionData,
  isConnected as isConnectedSelector,
  setActiveConnection,
  updateConnection
} from 'shared/modules/connections/connectionsDuck'
import {
  AuthenticationMethod,
  FORCE_CHANGE_PASSWORD
} from 'shared/modules/connections/connectionsDuck'
import { shouldRetainConnectionCredentials } from 'shared/modules/dbMeta/dbMetaDuck'
import { CONNECTION_ID } from 'shared/modules/discovery/discoveryDuck'
import { FOCUS } from 'shared/modules/editor/editorDuck'
import {
  getInitCmd,
  getPlayImplicitInitCommands
} from 'shared/modules/settings/settingsDuck'
import { NEO4J_CLOUD_DOMAINS } from 'shared/modules/settings/settingsDuck'
import {
  AUTH_STORAGE_CONNECTION_PROFILES,
  isCloudHost
} from 'shared/services/utils'
import { GlobalState } from 'shared/globalState'

// Helper functions (outside component)
const isAuraHost = (host: string) => isCloudHost(host, NEO4J_CLOUD_DOMAINS)

function getAllowedAuthMethodsForHost(host: string): AuthenticationMethod[] {
  return isAuraHost(host) ? [NATIVE] : [NATIVE, NO_AUTH]
}

const getAllowedSchemesForHost = (host: string, allowedSchemes: string[]) =>
  isAuraHost(host) ? CLOUD_SCHEMES : allowedSchemes

// Types
interface ConnectionFormControllerProps {
  frame: {
    connectionData?: {
      host?: string
      username?: string
      password?: string
      authenticationMethod?: AuthenticationMethod
      supportsMultiDb?: boolean
    }
  }
  onSuccess?: () => void
  showExistingPasswordInput?: boolean
  error: (
    err: Error | { code?: string; message?: string } | Record<string, never>
  ) => void
  children?: React.ReactNode
  passwordChangeNeeded?: boolean
  forcePasswordChange?: boolean
}

interface ConnectionState {
  requestedUseDb: string
  host: string
  hostInputVal: string
  username: string
  password: string
  authenticationMethod: AuthenticationMethod
  isLoading: boolean
  connecting: boolean
  passwordChangeNeeded: boolean
  forcePasswordChange: boolean
  used: boolean
  profiles: ConnectionProfile[]
  supportsMultiDb?: boolean
}

export const ConnectionFormController: React.FC<
  ConnectionFormControllerProps
> = ({
  frame,
  onSuccess,
  showExistingPasswordInput,
  error,
  children,
  passwordChangeNeeded: initialPasswordChangeNeeded = false,
  forcePasswordChange: initialForcePasswordChange = false
}) => {
  // Redux selectors
  const discoveredData = useSelector((state: GlobalState) =>
    getConnectionData(state, CONNECTION_ID)
  )
  const initCmd = useSelector(getInitCmd)
  const activeConnection = useSelector(getActiveConnection)
  const activeConnectionData = useSelector(getActiveConnectionData)
  const playImplicitInitCommands = useSelector(getPlayImplicitInitCommands)
  const storeCredentials = useSelector(shouldRetainConnectionCredentials)
  const isConnected = useSelector(isConnectedSelector)
  const allowedSchemes = useSelector(getAllowedBoltSchemes)

  // Redux dispatch
  const dispatch = useDispatch()

  // Bus hook
  const bus = useBus()

  // Refs for cleanup and retry logic
  const mountedRef = useRef(true)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const successCallbackRef = useRef(onSuccess || (() => {}))

  // Update success callback ref when prop changes
  useEffect(() => {
    successCallbackRef.current = onSuccess || (() => {})
  }, [onSuccess])

  // Get connection data from props or discovered data
  const getConnection = useCallback(() => {
    return discoveredData || frame.connectionData || {}
  }, [discoveredData, frame.connectionData])

  // Initialize state
  const initializeState = useCallback((): ConnectionState => {
    const connection = discoveredData || frame.connectionData || {}
    const { searchParams } = new URL(window.location.href)
    const searchParamAuthMethod = searchParams.get('preselectAuthMethod')
    const authMethod =
      searchParamAuthMethod ??
      ((connection && connection.authenticationMethod) || NATIVE)

    const hostAllowedSchemes = getAllowedSchemesForHost(
      connection.host || '',
      allowedSchemes
    )

    // supportsMultiDb may come from frame.connectionData but not from discoveredData (Connection type)
    const supportsMultiDb = frame.connectionData?.supportsMultiDb

    return {
      requestedUseDb: '',
      host: generateBoltUrl(hostAllowedSchemes, connection.host || ''),
      hostInputVal: '',
      username: connection.username || '',
      password: connection.password || '',
      authenticationMethod: authMethod as AuthenticationMethod,
      isLoading: false,
      connecting: false,
      passwordChangeNeeded: initialPasswordChangeNeeded,
      forcePasswordChange: initialForcePasswordChange,
      used: isConnected,
      profiles: [],
      supportsMultiDb
    }
  }, [
    discoveredData,
    frame.connectionData,
    allowedSchemes,
    initialPasswordChangeNeeded,
    initialForcePasswordChange,
    isConnected
  ])

  // State
  const [state, setState] = useState<ConnectionState>(initializeState)

  // Load profiles from localStorage
  const loadProfiles = useCallback(() => {
    const savedProfiles = localStorage.getItem(AUTH_STORAGE_CONNECTION_PROFILES)
    if (savedProfiles) {
      setState(prev => ({ ...prev, profiles: JSON.parse(savedProfiles) }))
    }
  }, [])

  // Profile management handlers
  const onProfileSave = useCallback((profile: ConnectionProfile) => {
    setState(prev => {
      const updatedProfiles = [...prev.profiles, profile]
      localStorage.setItem(
        AUTH_STORAGE_CONNECTION_PROFILES,
        JSON.stringify(updatedProfiles)
      )
      return { ...prev, profiles: updatedProfiles }
    })
  }, [])

  const onProfileSelect = useCallback((profile: ConnectionProfile) => {
    setState(prev => ({
      ...prev,
      host: profile.host,
      username: profile.username,
      password: profile.password,
      authenticationMethod: profile.authenticationMethod as AuthenticationMethod
    }))
  }, [])

  // Save credentials to Redux store
  const saveCredentials = useCallback(() => {
    dispatch(
      updateConnection({
        id: CONNECTION_ID,
        host: state.host,
        username: state.username,
        password: state.password,
        authenticationMethod: state.authenticationMethod
      })
    )
  }, [
    dispatch,
    state.host,
    state.username,
    state.password,
    state.authenticationMethod
  ])

  // Execute init command
  const executeInitCmd = useCallback(() => {
    dispatch(executeSystemCommand(initCmd))
  }, [dispatch, initCmd])

  // Save and start connection
  const saveAndStart = useCallback(() => {
    setState(prev => ({
      ...prev,
      forcePasswordChange: false,
      used: true,
      username: '',
      password: ''
    }))

    successCallbackRef.current()
    bus.send(FOCUS)
    saveCredentials()
    dispatch(setActiveConnection(CONNECTION_ID))

    if (playImplicitInitCommands) {
      executeInitCmd()
    }
  }, [bus, saveCredentials, dispatch, playImplicitInitCommands, executeInitCmd])

  // Try connect (for password verification)
  const tryConnect = useCallback(
    (password: string, doneFn: (res: { success: boolean }) => void) => {
      error({})
      bus.self(
        VERIFY_CREDENTIALS,
        { ...state, password },
        (res: { success: boolean }) => {
          if (mountedRef.current) {
            doneFn(res)
          }
        }
      )
    },
    [bus, error, state]
  )

  // Main connect function
  const connect = useCallback(
    (
      doneFn: () => void = () => {},
      onError:
        | ((res: { error: { code: string; message?: string } }) => void)
        | null = null,
      noResetConnectionOnFail = false
    ) => {
      error({})
      bus.self(
        CONNECT,
        {
          ...state,
          noResetConnectionOnFail
        },
        (res: {
          success: boolean
          error?: { code: string; message?: string }
        }) => {
          if (!mountedRef.current) return

          if (res.success) {
            doneFn()
            saveAndStart()
          } else if (res.error) {
            if (
              res.error.code === 'Neo.ClientError.Security.CredentialsExpired'
            ) {
              doneFn()
              setState(prev => ({ ...prev, passwordChangeNeeded: true }))
            } else if (
              !isAuraHost(state.host) &&
              res.error.message &&
              isNonSupportedRoutingSchemeError(
                res.error as { code: string; message: string }
              )
            ) {
              // Need to switch scheme to bolt:// for Neo4j 3.x connections
              const url = toggleSchemeRouting(state.host)
              error(
                Error(
                  `Could not connect with the "${getScheme(
                    state.host
                  )}://" scheme to this Neo4j server. Automatic retry using the "${getScheme(
                    url
                  )}://" scheme in a moment...`
                )
              )
              setState(prev => ({ ...prev, host: url, hostInputVal: url }))

              // Schedule retry
              retryTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  connect(doneFn, onError, noResetConnectionOnFail)
                }
              }, 5000)
            } else {
              doneFn()
              if (onError) {
                onError({ error: res.error })
              } else {
                error(res.error)
              }
            }
          }
        }
      )
    },
    [bus, error, state, saveAndStart]
  )

  // Change handlers
  const onDatabaseChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const requestedUseDb = event.target.value
      setState(prev => ({ ...prev, requestedUseDb }))
      error({})
    },
    [error]
  )

  const onUsernameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const username = event.target.value
      setState(prev => ({ ...prev, username }))
      error({})
    },
    [error]
  )

  const onPasswordChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const password = event.target.value
      setState(prev => ({ ...prev, password }))
      error({})
    },
    [error]
  )

  const onAuthenticationMethodChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const authenticationMethod = event.target.value as AuthenticationMethod
      setState(prev => {
        const username =
          authenticationMethod === NO_AUTH ? '' : prev.username || 'neo4j'
        const password = authenticationMethod === NO_AUTH ? '' : prev.password
        return { ...prev, authenticationMethod, username, password }
      })
      error({})
    },
    [error]
  )

  const onHostChange = useCallback(
    (fallbackScheme: string, val: string) => {
      const hostAllowedSchemes = getAllowedSchemesForHost(val, allowedSchemes)
      const url = generateBoltUrl(hostAllowedSchemes, val, fallbackScheme)
      setState(prev => ({
        ...prev,
        host: url,
        hostInputVal: url
      }))
      error({})
    },
    [allowedSchemes, error]
  )

  const onChangePasswordChange = useCallback(() => {
    error({})
  }, [error])

  // Password change handler
  const onChangePassword = useCallback(
    ({
      newPassword,
      error: passwordError
    }: {
      newPassword?: string
      error?: { code: string; message: string }
    }) => {
      setState(prev => ({ ...prev, isLoading: true }))

      if (passwordError && passwordError.code) {
        setState(prev => ({ ...prev, isLoading: false }))
        return error(passwordError)
      }

      if (state.password === null) {
        setState(prev => ({ ...prev, isLoading: false }))
        return error({ message: 'Please set existing password' })
      }

      error({})

      bus.self(
        FORCE_CHANGE_PASSWORD,
        {
          host: state.host,
          username: state.username,
          password: state.password,
          newPassword
        },
        (response: {
          success: boolean
          error?: { code: string; message: string }
        }) => {
          if (!mountedRef.current) return

          if (response.success) {
            setState(prev => ({ ...prev, password: newPassword || '' }))

            let retries = 5
            const retryFn = (res: {
              error: { code: string; message?: string }
            }) => {
              if (!mountedRef.current) return

              // New password not accepted yet, initiate retry
              if (res.error.code === 'Neo.ClientError.Security.Unauthorized') {
                retries--
                if (retries > 0) {
                  setTimeout(() => {
                    if (mountedRef.current) {
                      connect(
                        () => {
                          if (mountedRef.current) {
                            setState(prev => ({ ...prev, isLoading: false }))
                          }
                        },
                        retryFn,
                        true
                      )
                    }
                  }, 200)
                }
              } else {
                error(res.error)
              }
            }

            connect(
              () => {
                if (mountedRef.current) {
                  setState(prev => ({ ...prev, isLoading: false }))
                }
              },
              retryFn,
              true
            )
          } else {
            setState(prev => ({ ...prev, isLoading: false }))
            if (response.error) {
              error(response.error)
            }
          }
        }
      )
    },
    [bus, error, state.host, state.username, state.password, connect]
  )

  // Set connecting state
  const setConnecting = useCallback((connecting: boolean) => {
    setState(prev => ({ ...prev, connecting }))
  }, [])

  // Effect: Auto-connect if NO_AUTH and load profiles on mount
  useEffect(() => {
    mountedRef.current = true

    if (state.authenticationMethod === NO_AUTH) {
      setState(prev => ({ ...prev, connecting: true }))
      connect(() => {
        if (mountedRef.current) {
          setState(prev => ({ ...prev, connecting: false }))
        }
      })
    }

    loadProfiles()

    return () => {
      mountedRef.current = false
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Render
  let view: React.ReactNode

  if (
    state.forcePasswordChange ||
    (!isConnected && state.passwordChangeNeeded)
  ) {
    view = (
      <ChangePasswordForm
        showExistingPasswordInput={showExistingPasswordInput}
        onChangePasswordClick={onChangePassword}
        onChange={onChangePasswordChange}
        tryConnect={(
          password: string,
          doneFn: (res: { success: boolean }) => void
        ) => {
          setState(prev => ({ ...prev, isLoading: true }))
          tryConnect(password, doneFn)
        }}
        isLoading={state.isLoading}
      >
        {children}
      </ChangePasswordForm>
    )
  } else if (
    isConnected &&
    activeConnectionData &&
    activeConnectionData.authEnabled !== false // falsy value (except false) indicates we don't know yet, so see that as enabled.
  ) {
    view = (
      <ConnectedView
        host={state.host}
        username={activeConnectionData.username}
        storeCredentials={storeCredentials}
        hideStoreCredentials={state.authenticationMethod === NO_AUTH}
      />
    )
  } else if (
    isConnected &&
    activeConnectionData &&
    activeConnectionData.authEnabled === false // explicit false = auth disabled for sure
  ) {
    view = (
      <StyledConnectionBody>
        You have a working connection and server auth is disabled.
      </StyledConnectionBody>
    )
  } else if (!isConnected && !state.passwordChangeNeeded) {
    const host = state.hostInputVal || state.host
    const hostAllowedSchemes = getAllowedSchemesForHost(host, allowedSchemes)

    view = (
      <ConnectForm
        onConnectClick={connect}
        onHostChange={onHostChange}
        onUsernameChange={onUsernameChange}
        onPasswordChange={onPasswordChange}
        onDatabaseChange={onDatabaseChange}
        onAuthenticationMethodChange={onAuthenticationMethodChange}
        connecting={state.connecting}
        setIsConnecting={setConnecting}
        host={host}
        username={state.username}
        password={state.password}
        database={state.requestedUseDb}
        supportsMultiDb={state.supportsMultiDb || false}
        used={state.used}
        allowedSchemes={hostAllowedSchemes}
        allowedAuthMethods={getAllowedAuthMethodsForHost(
          state.hostInputVal || state.host
        )}
        authenticationMethod={state.authenticationMethod}
        onProfileSave={onProfileSave}
        onProfileSelect={onProfileSelect}
        profiles={state.profiles}
      />
    )
  }

  return <>{view}</>
}

export default ConnectionFormController
