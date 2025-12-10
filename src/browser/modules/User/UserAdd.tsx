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
import { map } from 'lodash-es'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { connect } from 'react-redux'
import { withBus } from 'react-suber'
import { v4 as uuidv4 } from 'uuid'

import { CloseIcon } from 'browser-components/icons/LegacyIcons'

import RolesSelector from './RolesSelector'
import { StyleRolesContainer, StyledInput } from './styled'
import { EnterpriseOnlyFrame } from 'browser-components/EditionView'
import {
  StyledForm,
  StyledFormElement,
  StyledFormElementWrapper,
  StyledLabel
} from 'browser-components/Form'
import { FormButton, StyledLink } from 'browser-components/buttons'
import FrameAside from 'browser/modules/Frame/FrameAside'
import FrameBodyTemplate from 'browser/modules/Frame/FrameBodyTemplate'
import FrameError from 'browser/modules/Frame/FrameError'
import FrameSuccess from 'browser/modules/Frame/FrameSuccess'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import {
  commandSources,
  executeCommand
} from 'shared/modules/commands/commandsDuck'
import { isConnectedAuraHost } from 'shared/modules/connections/connectionsDuck'
import {
  addRoleToUser,
  createDatabaseUser,
  listRolesQuery
} from 'shared/modules/cypher/boltUserHelper'
import { ROUTED_CYPHER_WRITE_REQUEST } from 'shared/modules/cypher/cypherDuck'
import {
  canAssignRolesToUser,
  isEnterprise
} from 'shared/modules/dbMeta/dbMetaDuck'
import { driverDatabaseSelection } from 'shared/modules/features/versionedFeatures'
import { Bus } from 'suber'

interface UserAddProps {
  availableRoles?: string[]
  roles?: string[]
  useSystemDb?: string
  isEnterpriseEdition: boolean
  isAura: boolean
  isCollapsed: boolean
  isFullscreen: boolean
  isLoading?: boolean
  frame: { cmd: string }
  bus: Bus
}

export const UserAdd: React.FC<UserAddProps> = props => {
  const {
    availableRoles: propAvailableRoles,
    roles: propRoles,
    useSystemDb,
    isEnterpriseEdition,
    isAura,
    isCollapsed,
    isFullscreen,
    isLoading: propIsLoading,
    frame,
    bus
  } = props

  const [availableRoles, setAvailableRoles] = useState<string[]>(
    propAvailableRoles || []
  )
  const [roles, setRoles] = useState<string[]>(propRoles || [])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [forcePasswordChange, setForcePasswordChange] = useState(false)
  const [errors, setErrors] = useState<string[] | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getRoles = useCallback(() => {
    if (!bus) return

    bus.self(
      ROUTED_CYPHER_WRITE_REQUEST,
      {
        query: listRolesQuery(Boolean(useSystemDb)),
        queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
        useDb: useSystemDb
      },
      (response: any) => {
        if (!response.success) {
          const error =
            response.error && response.error.message
              ? response.error.message
              : 'Unknown error'
          setErrors(['Unable to get roles list', error])
          return
        }
        setAvailableRoles(
          map(response.result.records, record => record.get('role'))
        )
      }
    )
  }, [bus, useSystemDb])

  // Fetch roles on mount (equivalent to constructor call)
  useEffect(() => {
    getRoles()
  }, [getRoles])

  const removeRole = useCallback(
    (role: string) => {
      const newRoles = roles.slice()
      const index = newRoles.indexOf(role)
      if (index > -1) {
        newRoles.splice(index, 1)
      }
      return newRoles
    },
    [roles]
  )

  const addRoles = useCallback(
    (createdUsername: string) => {
      const localErrors: string[] = []
      roles.forEach((role: string) => {
        if (bus) {
          bus.self(
            ROUTED_CYPHER_WRITE_REQUEST,
            {
              query: addRoleToUser(createdUsername, role, Boolean(useSystemDb)),
              params: {
                username: createdUsername,
                role
              },
              queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
              useDb: useSystemDb
            },
            (response: any) => {
              if (!response.success) {
                localErrors.push(response.error)
              }
            }
          )
        }
      })
      if (localErrors.length > 0) {
        setErrors(localErrors)
        setIsLoading(false)
        return
      }
      setSuccess(`User '${createdUsername}' created`)
      setUsername('')
      setPassword('')
      setConfirmPassword('')
      setRoles([])
      setForcePasswordChange(false)
      setIsLoading(false)
    },
    [bus, roles, useSystemDb]
  )

  const createUser = useCallback(() => {
    if (!bus) return

    bus.self(
      ROUTED_CYPHER_WRITE_REQUEST,
      {
        query: createDatabaseUser(
          { username, password, forcePasswordChange },
          Boolean(useSystemDb)
        ),
        params: {
          username,
          password
        },
        queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
        useDb: useSystemDb
      },
      (response: any) => {
        if (!response.success) {
          const error =
            response.error && response.error.message
              ? response.error.message
              : 'Unknown error'
          setErrors(['Unable to create user', error])
          setIsLoading(false)
          return
        }
        addRoles(username)
      }
    )
  }, [bus, username, password, forcePasswordChange, useSystemDb, addRoles])

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()

      setIsLoading(true)
      setSuccess(null)
      setErrors(null)

      const validationErrors: string[] = []
      if (!username) validationErrors.push('Missing username')
      if (!password) validationErrors.push('Missing password')
      if (password !== confirmPassword) {
        validationErrors.push('Passwords are not the same')
      }
      if (validationErrors.length !== 0) {
        setErrors(validationErrors)
        setIsLoading(false)
        return
      }
      createUser()
    },
    [username, password, confirmPassword, createUser]
  )

  const updateUsername = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setUsername(event.target.value)
    },
    []
  )

  const updatePassword = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value)
    },
    []
  )

  const confirmUpdatePassword = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(event.target.value)
    },
    []
  )

  const updateForcePasswordChange = useCallback(() => {
    setForcePasswordChange(prev => !prev)
  }, [])

  const filteredAvailableRoles = useMemo(() => {
    return availableRoles.filter((role: string) => roles.indexOf(role) < 0)
  }, [availableRoles, roles])

  const openListUsersFrame = useCallback(() => {
    const action = executeCommand(':server user list', {
      source: commandSources.button
    })
    bus.send(action.type, action)
  }, [bus])

  const handleRoleSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setRoles(prev => prev.concat([event.target.value]))
    },
    []
  )

  const handleRemoveRole = useCallback(
    (role: string) => {
      setRoles(removeRole(role))
    },
    [removeRole]
  )

  const listRolesDisplay = useMemo(() => {
    return (
      !!roles.length && (
        <StyleRolesContainer className="roles-inline">
          {roles.map((role: string, i: number) => {
            return (
              <FormButton
                key={i}
                label={role}
                icon={<CloseIcon />}
                buttonType="tag"
                onClick={() => handleRemoveRole(role)}
              />
            )
          })}
        </StyleRolesContainer>
      )
    )
  }, [roles, handleRemoveRole])

  const formId = useMemo(() => uuidv4(), [])
  const usernameId = `username-${formId}`
  const passwordId = `password-${formId}`
  const passwordConfirmId = `password-confirm-${formId}`
  const rolesSelectorId = `roles-selector-${formId}`

  const listOfAvailableRoles = useMemo(() => {
    return availableRoles ? (
      <RolesSelector
        roles={filteredAvailableRoles}
        className="roles"
        name={rolesSelectorId}
        id={rolesSelectorId}
        onChange={handleRoleSelect}
      />
    ) : (
      '-'
    )
  }, [
    availableRoles,
    filteredAvailableRoles,
    rolesSelectorId,
    handleRoleSelect
  ])

  let aside
  let frameContents
  let displayErrors = errors ? errors.join(', ') : null

  if (isAura) {
    displayErrors = null
    aside = (
      <FrameAside
        title="Frame unavailable"
        subtitle="Frame not currently available on aura."
      />
    )
    frameContents = (
      <div>
        <p>
          User management is currently only available through cypher commands on
          Neo4j Aura Enterprise.
        </p>
        <p>
          Read more on user and role management with cypher on{' '}
          <a
            href="https://neo4j.com/docs/cypher-manual/current/administration/security/users-and-roles"
            target="_blank"
            rel="noreferrer"
          >
            the Neo4j Cypher docs.
          </a>
        </p>
      </div>
    )
  } else if (!isEnterpriseEdition) {
    displayErrors = null
    aside = (
      <FrameAside
        title="Frame unavailable"
        subtitle="What edition are you running?"
      />
    )
    frameContents = <EnterpriseOnlyFrame command={frame.cmd} />
  } else {
    aside = (
      <FrameAside
        title="Add user"
        subtitle="Add a user to the current database"
      />
    )
    frameContents = (
      <StyledForm id={`user-add-${formId}`} onSubmit={submit}>
        <StyledFormElement>
          <StyledLabel htmlFor={usernameId}>Username</StyledLabel>
          <StyledInput
            className="username"
            name={usernameId}
            id={usernameId}
            value={username}
            onChange={updateUsername}
            disabled={propIsLoading || isLoading}
          />
        </StyledFormElement>

        <StyledFormElementWrapper>
          <StyledFormElement>
            <StyledLabel htmlFor={passwordId}>Password</StyledLabel>
            <StyledInput
              type="password"
              className="password"
              name={passwordId}
              id={passwordId}
              value={password}
              onChange={updatePassword}
              disabled={propIsLoading || isLoading}
            />
          </StyledFormElement>
          <StyledFormElement>
            <StyledLabel htmlFor={passwordConfirmId}>
              Confirm password
            </StyledLabel>
            <StyledInput
              type="password"
              className="password-confirm"
              name={passwordConfirmId}
              id={passwordConfirmId}
              value={confirmPassword}
              onChange={confirmUpdatePassword}
              disabled={propIsLoading || isLoading}
            />
          </StyledFormElement>
        </StyledFormElementWrapper>

        <StyledFormElement>
          <StyledLabel htmlFor={rolesSelectorId}>Roles</StyledLabel>
          {listOfAvailableRoles}
          {listRolesDisplay}
        </StyledFormElement>

        <StyledFormElement>
          <StyledLabel>
            <StyledInput
              onChange={updateForcePasswordChange}
              checked={forcePasswordChange}
              disabled={propIsLoading || isLoading}
              type="checkbox"
            />
            Force password change
          </StyledLabel>
        </StyledFormElement>

        <StyledFormElement>
          <FormButton
            data-testid="Add User"
            type="submit"
            label="Add User"
            disabled={propIsLoading || isLoading}
          />
        </StyledFormElement>

        <StyledLink onClick={openListUsersFrame}>See user list</StyledLink>
      </StyledForm>
    )
  }

  const getStatusBar = () => {
    if (displayErrors)
      return <FrameError message={displayErrors} code="Error" />
    if (success) {
      return <FrameSuccess message={success} />
    }
    return null
  }

  return (
    <FrameBodyTemplate
      isCollapsed={isCollapsed}
      isFullscreen={isFullscreen}
      aside={aside}
      contents={frameContents}
      statusBar={getStatusBar()}
    />
  )
}

const mapStateToProps = (state: any) => {
  const { database } = driverDatabaseSelection(state, 'system') || {}
  const isEnterpriseEdition = isEnterprise(state)
  const isAura = isConnectedAuraHost(state)

  return {
    canAssignRolesToUser: canAssignRolesToUser(state),
    useSystemDb: database,
    isEnterpriseEdition,
    isAura
  }
}

export default withBus(connect(mapStateToProps, null)(UserAdd))
