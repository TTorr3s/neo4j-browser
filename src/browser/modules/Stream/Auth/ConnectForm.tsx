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
import { Neo4jError, hasReachableServer } from 'neo4j-driver'
import React, { type JSX, useEffect, useState } from 'react'

import { toKeyString } from 'neo4j-arc/common'

import AutoExecButton from '../auto-exec-button'
import {
  StyledAuthToggle,
  StyledConnectButton,
  StyledConnectionForm,
  StyledConnectionFormEntry,
  StyledConnectionLabel,
  StyledConnectionSelect,
  StyledConnectionTextInput,
  StyledCredentialsRow,
  StyledDeleteConfirm,
  StyledDeleteConfirmNo,
  StyledDeleteConfirmYes,
  StyledDeleteLink,
  StyledDeleteProfileAction,
  StyledFormContainer,
  StyledFormSection,
  StyledProfileAddButton,
  StyledProfileRow,
  StyledSaveProfileRow,
  StyledSectionHeader,
  StyledSegment
} from './styled'
import { FormButton } from 'browser-components/buttons'
import { SmallSpinnerIcon } from 'browser-components/icons/LegacyIcons'
import { NATIVE, NO_AUTH } from 'services/bolt/boltHelpers'
import { getScheme, stripScheme } from 'services/boltscheme.utils'
import {
  AuthenticationMethod,
  ConnectionProfile
} from 'shared/modules/connections/connectionsDuck'
import {
  loadEncryptedProfiles,
  saveEncryptedProfiles
} from 'shared/services/credentialEncryption'
import { AUTH_STORAGE_CONNECTION_PROFILES } from 'shared/services/utils'

const readableauthenticationMethods: Record<AuthenticationMethod, string> = {
  [NATIVE]: 'Username / Password',
  [NO_AUTH]: 'No authentication'
}

interface ConnectFormProps {
  allowedSchemes: string[]
  allowedAuthMethods: AuthenticationMethod[]
  authenticationMethod: string
  host: string
  onAuthenticationMethodChange: (event: any) => void
  onConnectClick: (doneFn?: () => void) => void
  onHostChange: (fallbackScheme: string, newHost: string) => void
  onUsernameChange: (event: any) => void
  onPasswordChange: (event: any) => void
  onDatabaseChange: (event: any) => void
  database: string
  password: string
  username: string
  used: boolean
  supportsMultiDb: boolean
  connecting: boolean
  setIsConnecting: (c: boolean) => void
  onProfileSave: (profile: ConnectionProfile) => void
  onProfileSelect: (profile: ConnectionProfile) => void
  profiles: ConnectionProfile[]
}
export type HttpReachablity =
  | { status: 'noRequest' }
  | { status: 'loading' }
  | { status: 'requestFailed'; error: Error }
  | { status: 'parsingJsonFailed'; error: Error }
  | { status: 'foundBoltPort' }
  | {
      status: 'foundAdvertisedBoltAddress'
      advertisedAddress: string
      redirected: boolean
    }
  | { status: 'foundOtherJSON'; json: Record<string, unknown> }

export async function httpReachabilityCheck(
  url: string
): Promise<HttpReachablity> {
  let res
  try {
    res = await fetch(url, {
      method: 'get',
      headers: {
        Accept: 'application/json'
      }
    })
  } catch (error) {
    return { status: 'requestFailed', error: error as Error }
  }

  let json
  try {
    json = await res.json()
  } catch (error) {
    return { status: 'parsingJsonFailed', error: error as Error }
  }

  const isNeo4jDiscoveryData =
    'auth_config' in json && 'oidc_providers' in json.auth_config

  if (!isNeo4jDiscoveryData) {
    return { status: 'foundOtherJSON', json }
  }

  const advertisedAddress = json.bolt_routing ?? json.bolt_direct
  if (advertisedAddress) {
    return {
      status: 'foundAdvertisedBoltAddress',
      advertisedAddress,
      redirected: res.redirected
    }
  } else {
    return { status: 'foundBoltPort' }
  }
}

export async function boltReachabilityCheck(url: string, secure?: boolean) {
  try {
    // The encryption flag needs to be set explicitly to disable automatic switching to match hosting
    // @ts-ignore signature is wrong
    await hasReachableServer(url, {
      ...(secure !== undefined ? { encrypted: secure } : undefined)
    })
    return true
  } catch (e) {
    return e as Neo4jError
  }
}

export default function ConnectForm(props: ConnectFormProps): JSX.Element {
  const [scheme, setScheme] = useState(
    props.allowedSchemes ? `${getScheme(props.host)}://` : ''
  )

  const [profiles, setProfiles] = useState<ConnectionProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [profileName, setProfileName] = useState<string>('')

  useEffect(() => {
    loadEncryptedProfiles<ConnectionProfile>(
      AUTH_STORAGE_CONNECTION_PROFILES
    ).then(loadedProfiles => {
      setProfiles(loadedProfiles)
      if (loadedProfiles.length === 1) {
        const profile = loadedProfiles[0]
        setSelectedProfile(profile.name)
        props.onProfileSelect(profile)
      }
    })
  }, [])

  const saveProfile = () => {
    const newProfile: ConnectionProfile = {
      name: profileName,
      host: props.host,
      password: props.password,
      username: props.username,
      authenticationMethod: props.authenticationMethod
    }

    const updatedProfiles = [...profiles, newProfile]
    setProfiles(updatedProfiles)
    saveEncryptedProfiles(AUTH_STORAGE_CONNECTION_PROFILES, updatedProfiles)
    props.onProfileSave(newProfile)
    setProfileName('')
  }

  const loadProfile = (profileName: string) => {
    const profile = profiles.find(profile => profile.name === profileName)
    if (profile) {
      setSelectedProfile(profileName)
      setConfirmingDelete(false)
      props.onProfileSelect(profile)
    }
  }

  const deleteProfile = () => {
    const updatedProfiles = profiles.filter(p => p.name !== selectedProfile)
    setProfiles(updatedProfiles)
    saveEncryptedProfiles(AUTH_STORAGE_CONNECTION_PROFILES, updatedProfiles)
    setSelectedProfile('')
    setConfirmingDelete(false)
  }

  useEffect(() => {
    if (props.allowedSchemes) {
      return setScheme(`${getScheme(props.host)}://`)
    }
    setScheme('')
  }, [props.host, props.allowedSchemes])

  // Add scheme when copying text from bolt url field
  const onCopyBoltUrl = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const selection = document.getSelection()
    if (!selection) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    let val = selection.toString()
    if (scheme) {
      val = `${scheme}${stripScheme(val)}`
    }
    e.clipboardData?.setData('text', val)
  }

  async function reachabilityCheck(url: string) {
    setReachablityState('loading')
    const res = await httpReachabilityCheck(`//${stripScheme(url)}`)

    // Being reachable by http is not a requirement (you could have some really odd network setup)
    // But if it doesn't work though, it is likely the connection will time out which can take a while
    // we use this state to set a warning in the UI
    if (res.status === 'parsingJsonFailed' || res.status === 'foundOtherJSON') {
      setReachablityState('probablyFailed')
    }

    const boltStatus = await boltReachabilityCheck(url)
    setReachablityState(boltStatus === true ? 'succeeded' : 'failed')
  }

  const onHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReachablityState('no_attempt')
    const val = e.target.value
    props.onHostChange(getScheme(scheme), val)
  }

  const onSchemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value

    reachabilityCheck(val + stripScheme(props.host))
    props.onHostChange(getScheme(val), stripScheme(props.host))
  }

  const onConnectClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    props.setIsConnecting(true)
    props.onConnectClick(() => props.setIsConnecting(false))
  }

  const schemeRestriction = props.allowedSchemes.length > 0

  const [reachabilityState, setReachablityState] = useState<
    'no_attempt' | 'loading' | 'probablyFailed' | 'failed' | 'succeeded'
  >('no_attempt')

  useEffect(() => {
    if (stripScheme(props.host) !== '') {
      reachabilityCheck(props.host)
    }
  }, [])

  const [showSaveProfile, setShowSaveProfile] = useState(false)
  const [showAuthSelect, setShowAuthSelect] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  return (
    <StyledFormContainer>
      <StyledConnectionForm onSubmit={onConnectClick}>
        <StyledConnectionFormEntry>
          <StyledConnectionLabel htmlFor="url-input">
            Connect URL{' '}
            <span style={{ fontStyle: 'italic' }}>
              {reachabilityState === 'loading' && <SmallSpinnerIcon />}
              {reachabilityState === 'probablyFailed' && (
                <span style={{ color: 'orange' }}>
                  <SmallSpinnerIcon /> Connection will probably time out.
                </span>
              )}
              {reachabilityState === 'failed' && (
                <>
                  {' '}
                  - Could not reach Neo4j.{' '}
                  {props.host.includes('localhost') &&
                    !props.host.includes('localhost:7687') &&
                    '(default port is 7687) '}
                </>
              )}
            </span>
          </StyledConnectionLabel>
          {schemeRestriction ? (
            <>
              <StyledSegment>
                <StyledConnectionSelect
                  onChange={onSchemeChange}
                  value={scheme}
                  data-testid="bolt-scheme-select"
                >
                  {props.allowedSchemes.map(s => {
                    const schemeString = `${s}://`
                    return (
                      <option value={schemeString} key={toKeyString(s)}>
                        {schemeString}
                      </option>
                    )
                  })}
                </StyledConnectionSelect>
                <StyledConnectionTextInput
                  onCopy={onCopyBoltUrl}
                  data-testid="boltaddress"
                  onChange={onHostChange}
                  value={stripScheme(props.host)}
                  id="url-input"
                  onBlur={() => reachabilityCheck(props.host)}
                />
              </StyledSegment>
            </>
          ) : (
            <StyledConnectionTextInput
              data-testid="boltaddress"
              onChange={onHostChange}
              value={props.host}
              onBlur={() => reachabilityCheck(props.host)}
            />
          )}
        </StyledConnectionFormEntry>

        {props.authenticationMethod === NATIVE && (
          <StyledConnectionFormEntry>
            <StyledCredentialsRow>
              <div>
                <StyledConnectionLabel>
                  Username
                  <StyledConnectionTextInput
                    data-testid="username"
                    onChange={props.onUsernameChange}
                    value={props.username}
                  />
                </StyledConnectionLabel>
              </div>
              <div>
                <StyledConnectionLabel>
                  Password
                  <StyledConnectionTextInput
                    data-testid="password"
                    onChange={props.onPasswordChange}
                    value={props.password}
                    type="password"
                    autoComplete="off"
                  />
                </StyledConnectionLabel>
              </div>
            </StyledCredentialsRow>
            {props.allowedAuthMethods.length > 1 && (
              <StyledAuthToggle
                type="button"
                onClick={() => setShowAuthSelect(!showAuthSelect)}
              >
                {readableauthenticationMethods[
                  props.authenticationMethod as AuthenticationMethod
                ] ?? 'Authentication'}{' '}
                &#9662;
              </StyledAuthToggle>
            )}
          </StyledConnectionFormEntry>
        )}

        {props.authenticationMethod !== NATIVE &&
          props.allowedAuthMethods.length > 1 && (
            <StyledConnectionFormEntry>
              <StyledAuthToggle
                type="button"
                onClick={() => setShowAuthSelect(!showAuthSelect)}
              >
                {readableauthenticationMethods[
                  props.authenticationMethod as AuthenticationMethod
                ] ?? 'Authentication'}{' '}
                &#9662;
              </StyledAuthToggle>
            </StyledConnectionFormEntry>
          )}

        {showAuthSelect && props.allowedAuthMethods.length > 1 && (
          <StyledConnectionFormEntry>
            <StyledConnectionLabel>
              Authentication type
              <StyledConnectionSelect
                data-testid="authenticationMethod"
                onChange={e => {
                  props.onAuthenticationMethodChange(e)
                  setShowAuthSelect(false)
                }}
                value={props.authenticationMethod}
              >
                {props.allowedAuthMethods.map(auth => (
                  <option value={auth} key={auth}>
                    {readableauthenticationMethods[auth]}
                  </option>
                ))}
              </StyledConnectionSelect>
            </StyledConnectionLabel>
          </StyledConnectionFormEntry>
        )}

        {props.supportsMultiDb && (
          <StyledConnectionFormEntry>
            <StyledConnectionLabel>
              Database - leave empty for default
              <StyledConnectionTextInput
                data-testid="database"
                onChange={props.onDatabaseChange}
                value={props.database}
              />
            </StyledConnectionLabel>
          </StyledConnectionFormEntry>
        )}

        <StyledConnectionFormEntry>
          <StyledConnectButton
            data-testid="connect"
            type="submit"
            disabled={props.connecting}
            title={
              reachabilityState === 'succeeded'
                ? 'Connect.'
                : 'Make sure a neo4j server is reachable at the connect URL.'
            }
            style={{
              opacity: props.connecting ? 0.4 : 1
            }}
          >
            {props.connecting ? 'Connecting...' : 'Connect'}
          </StyledConnectButton>
        </StyledConnectionFormEntry>

        <StyledFormSection>
          <StyledSectionHeader>
            <span>Profiles</span>
          </StyledSectionHeader>
          <StyledProfileRow>
            <div>
              <StyledConnectionSelect
                value={selectedProfile}
                onChange={e => loadProfile(e.target.value)}
              >
                <option value="">Select a profile</option>
                {profiles.map(profile => (
                  <option key={profile.name} value={profile.name}>
                    {profile.name}
                  </option>
                ))}
              </StyledConnectionSelect>
            </div>
            <StyledProfileAddButton
              type="button"
              title="Save current settings as a new profile"
              onClick={() => setShowSaveProfile(!showSaveProfile)}
            >
              {showSaveProfile ? '−' : '+'}
            </StyledProfileAddButton>
          </StyledProfileRow>
          {selectedProfile && (
            <StyledDeleteProfileAction>
              {confirmingDelete ? (
                <StyledDeleteConfirm>
                  Delete &quot;{selectedProfile}&quot;?
                  <StyledDeleteConfirmYes type="button" onClick={deleteProfile}>
                    Yes
                  </StyledDeleteConfirmYes>
                  <StyledDeleteConfirmNo
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    No
                  </StyledDeleteConfirmNo>
                </StyledDeleteConfirm>
              ) : (
                <StyledDeleteLink
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete profile
                </StyledDeleteLink>
              )}
            </StyledDeleteProfileAction>
          )}
          {showSaveProfile && (
            <StyledSaveProfileRow>
              <StyledConnectionTextInput
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Profile name"
              />
              <FormButton
                onClick={() => {
                  saveProfile()
                  setShowSaveProfile(false)
                }}
                type="button"
              >
                Save
              </FormButton>
            </StyledSaveProfileRow>
          )}
        </StyledFormSection>
      </StyledConnectionForm>
    </StyledFormContainer>
  )
}
