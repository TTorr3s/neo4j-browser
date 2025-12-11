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
import React, { useState, useCallback, useMemo } from 'react'
import { connect } from 'react-redux'
import { withBus } from 'react-suber'
import { v4 } from 'uuid'

import { CloseIcon } from 'browser-components/icons/LegacyIcons'

import RolesSelector from './RolesSelector'
import {
  StyleRolesContainer,
  StyledButtonContainer,
  StyledUserTd
} from './styled'
import { StyledBodyTr } from 'browser-components/DataTables'
import { FormButton } from 'browser-components/buttons'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import {
  activateUser,
  addRoleToUser,
  deleteUser,
  removeRoleFromUser,
  suspendUser
} from 'shared/modules/cypher/boltUserHelper'
import { CYPHER_REQUEST } from 'shared/modules/cypher/cypherDuck'
import { driverDatabaseSelection } from 'shared/modules/features/versionedFeatures'
import { Bus } from 'suber'

interface UserInformationProps {
  user: {
    username: string
    roles: string[]
    active: boolean
    passwordChangeRequired: boolean
  }
  availableRoles?: string[]
  refresh: () => void
  useSystemDb?: string
  bus: Bus
}

export const UserInformation = (props: UserInformationProps) => {
  const {
    user,
    availableRoles: propAvailableRoles,
    refresh,
    useSystemDb,
    bus
  } = props

  const [roles] = useState<string[]>(user.roles || [])
  const [username] = useState<string>(user.username)
  const [, setErrors] = useState<string[]>([])

  const handleResponse = useCallback(
    (response: { success: boolean; error?: string }) => {
      if (!response.success) {
        setErrors([response.error || 'Unknown error'])
        return
      }
      refresh()
    },
    [refresh]
  )

  const removeClick = useCallback(() => {
    bus.self(
      CYPHER_REQUEST,
      {
        query: deleteUser(username, Boolean(useSystemDb)),
        params: {
          username
        },
        queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
        useDb: useSystemDb
      },
      handleResponse
    )
  }, [bus, username, useSystemDb, handleResponse])

  const handleSuspendUser = useCallback(() => {
    bus.self(
      CYPHER_REQUEST,
      {
        query: suspendUser(username, Boolean(useSystemDb)),
        params: {
          username
        },
        queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
        useDb: useSystemDb
      },
      handleResponse
    )
  }, [bus, username, useSystemDb, handleResponse])

  const handleActivateUser = useCallback(() => {
    bus.self(
      CYPHER_REQUEST,
      {
        query: activateUser(username, Boolean(useSystemDb)),
        params: {
          username
        },
        queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
        useDb: useSystemDb
      },
      handleResponse
    )
  }, [bus, username, useSystemDb, handleResponse])

  const onRoleSelect = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      bus.self(
        CYPHER_REQUEST,
        {
          query: addRoleToUser(
            username,
            event.target.value,
            Boolean(useSystemDb)
          ),
          params: {
            username,
            role: event.target.value
          },
          queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
          useDb: useSystemDb
        },
        handleResponse
      )
    },
    [bus, username, useSystemDb, handleResponse]
  )

  const handleRemoveRole = useCallback(
    (role: string) => {
      bus.self(
        CYPHER_REQUEST,
        {
          query: removeRoleFromUser(role, username, Boolean(useSystemDb)),
          params: {
            username,
            role
          },
          queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
          useDb: useSystemDb
        },
        handleResponse
      )
    },
    [bus, username, useSystemDb, handleResponse]
  )

  const status = useMemo(
    () => (!user.active ? 'Suspended' : 'Active'),
    [user.active]
  )

  const passwordChange = useMemo(
    () => (user.passwordChangeRequired ? 'Required' : '-'),
    [user.passwordChangeRequired]
  )

  const availableRolesFiltered = useMemo(
    () =>
      (propAvailableRoles || []).filter(
        (role: string) => user.roles.indexOf(role) < 0
      ),
    [propAvailableRoles, user.roles]
  )

  const statusButton = useMemo(() => {
    return !user.active ? (
      <FormButton label="Activate" onClick={handleActivateUser} />
    ) : (
      <FormButton label="Suspend" onClick={handleSuspendUser} />
    )
  }, [user.active, handleActivateUser, handleSuspendUser])

  const listRoles = useMemo(() => {
    return (
      !!roles.length && (
        <StyleRolesContainer>
          {roles.map((role: string) => {
            return (
              <FormButton
                key={v4()}
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

  return (
    <StyledBodyTr className="user-info">
      <StyledUserTd className="username" aria-labelledby="username">
        <StyledButtonContainer>{user.username}</StyledButtonContainer>
      </StyledUserTd>
      <StyledUserTd className="roles" aria-labelledby="roles">
        <RolesSelector
          id={`roles-selector-${v4()}`}
          roles={availableRolesFiltered}
          onChange={onRoleSelect}
        />
      </StyledUserTd>
      <StyledUserTd className="current-roles" aria-labelledby="current-roles">
        <span>{listRoles}</span>
      </StyledUserTd>
      <StyledUserTd className="status" aria-labelledby="status">
        <StyledButtonContainer
          className={`status-indicator status-${status.toLowerCase()}`}
        >
          {status}
        </StyledButtonContainer>
      </StyledUserTd>
      <StyledUserTd className="status-action" aria-labelledby="status-action">
        {statusButton}
      </StyledUserTd>
      <StyledUserTd
        className="password-change"
        aria-labelledby="password-change"
      >
        <StyledButtonContainer>{passwordChange}</StyledButtonContainer>
      </StyledUserTd>
      <StyledUserTd className="delete" aria-labelledby="delete">
        <FormButton
          className="delete"
          label="Remove"
          buttonType="destructive"
          onClick={removeClick}
        />
      </StyledUserTd>
    </StyledBodyTr>
  )
}

const mapStateToProps = (state: any) => {
  const { database } = driverDatabaseSelection(state, 'system') || {}

  return {
    useSystemDb: database
  }
}

export default withBus(connect(mapStateToProps, null)(UserInformation))
