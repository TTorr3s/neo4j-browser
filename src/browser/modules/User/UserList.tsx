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
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { connect } from 'react-redux'
import { withBus } from 'react-suber'
import { v4 as uuidv4 } from 'uuid'

import FrameAside from '../Frame/FrameAside'
import FrameBodyTemplate from '../Frame/FrameBodyTemplate'
import UserInformation from './UserInformation'
import { StyledButtonContainer } from './styled'
import { StyledTable, StyledTh } from 'browser-components/DataTables'
import { EnterpriseOnlyFrame } from 'browser-components/EditionView'
import { StyledLink } from 'browser-components/buttons'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import {
  commandSources,
  executeCommand
} from 'shared/modules/commands/commandsDuck'
import { isConnectedAuraHost } from 'shared/modules/connections/connectionsDuck'
import { forceFetch } from 'shared/modules/currentUser/currentUserDuck'
import {
  listRolesQuery,
  listUsersQuery
} from 'shared/modules/cypher/boltUserHelper'
import { ROUTED_CYPHER_WRITE_REQUEST } from 'shared/modules/cypher/cypherDuck'
import { isEnterprise } from 'shared/modules/dbMeta/dbMetaDuck'
import { driverDatabaseSelection } from 'shared/modules/features/versionedFeatures'
import { Bus } from 'suber'

interface UserListProps {
  users?: any[]
  roles?: string[]
  isEnterpriseEdition: boolean
  isAura: boolean
  useSystemDb?: string
  isCollapsed: boolean
  isFullscreen: boolean
  frame: {
    ts: number
    isRerun?: boolean
    cmd: string
  }
  bus: Bus
}

interface UserRecord {
  username: string
  roles: string[]
  active: boolean
  passwordChangeRequired: boolean
}

const tableHeaderValues: Record<string, string> = {
  username: 'Username',
  roles: 'Add Role',
  'current-roles': 'Current Roles(s)',
  status: 'Status',
  'status-action': 'Action',
  'password-change': 'Password Change',
  delete: 'Delete'
}

export const UserList = (props: UserListProps) => {
  const {
    users: initialUsers,
    roles: initialRoles,
    isEnterpriseEdition,
    isAura,
    useSystemDb,
    isCollapsed,
    isFullscreen,
    frame,
    bus
  } = props

  const [userList, setUserList] = useState<UserRecord[]>(initialUsers || [])
  const [listRoles, setListRoles] = useState<string[]>(initialRoles || [])

  const prevFrameTsRef = useRef<number | undefined>(frame?.ts)

  const recordToUserObject = useCallback(
    (record: any): UserRecord => {
      const is40 = Boolean(useSystemDb)

      if (is40) {
        return {
          username: record.get('user'),
          roles: record.get('roles'),
          active: !record.get('suspended'),
          passwordChangeRequired: record.get('passwordChangeRequired')
        }
      }

      return {
        username: record.get('username'),
        roles: record.get('roles'),
        active: !record.get('flags').includes('is_suspended'),
        passwordChangeRequired: record
          .get('flags')
          .includes('password_change_required')
      }
    },
    [useSystemDb]
  )

  const getUserList = useCallback(() => {
    bus.self(
      ROUTED_CYPHER_WRITE_REQUEST,
      {
        query: listUsersQuery(Boolean(useSystemDb)),
        queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
        useDb: useSystemDb
      },
      (response: any) => {
        if (response.success) {
          setUserList(map(response.result.records, recordToUserObject))
          bus.send(forceFetch().type, forceFetch())
        }
      }
    )
  }, [bus, useSystemDb, recordToUserObject])

  const getRoles = useCallback(() => {
    bus.self(
      ROUTED_CYPHER_WRITE_REQUEST,
      {
        query: listRolesQuery(Boolean(useSystemDb)),
        queryType: NEO4J_BROWSER_USER_ACTION_QUERY,
        useDb: useSystemDb
      },
      (response: any) => {
        if (response.success) {
          setListRoles(
            map(response.result.records, record => record.get('role'))
          )
        }
      }
    )
  }, [bus, useSystemDb])

  // Initial fetch on mount
  useEffect(() => {
    if (isEnterpriseEdition) {
      getUserList()
      getRoles()
    }
  }, [isEnterpriseEdition, getUserList, getRoles])

  // Handle frame rerun
  useEffect(() => {
    if (
      prevFrameTsRef.current !== frame?.ts &&
      frame?.isRerun &&
      isEnterpriseEdition
    ) {
      getUserList()
      getRoles()
    }
    prevFrameTsRef.current = frame?.ts
  }, [frame?.ts, frame?.isRerun, isEnterpriseEdition, getUserList, getRoles])

  const openAddNewUserFrame = useCallback(() => {
    const action = executeCommand(':server user add', {
      source: commandSources.button
    })
    bus.send(action.type, action)
  }, [bus])

  const refresh = useCallback(() => {
    getUserList()
  }, [getUserList])

  const tableHeaders = useMemo(
    () =>
      Object.keys(tableHeaderValues).map((id, key) => (
        <StyledTh key={`${id}-${key}`} id={id}>
          {tableHeaderValues[id]}
        </StyledTh>
      )),
    []
  )

  const makeTable = useCallback(
    (data: UserRecord[]) => {
      const items = data.map((row: UserRecord) => (
        <UserInformation
          className="user-information"
          key={uuidv4()}
          user={row}
          refresh={refresh}
          availableRoles={listRoles}
        />
      ))

      return (
        <StyledTable>
          <thead>
            <tr>{tableHeaders}</tr>
          </thead>
          <tbody>
            {items}
            <tr>
              <td>
                <StyledButtonContainer>
                  <StyledLink onClick={openAddNewUserFrame}>
                    Add new user
                  </StyledLink>
                </StyledButtonContainer>
              </td>
            </tr>
          </tbody>
        </StyledTable>
      )
    },
    [tableHeaders, refresh, listRoles, openAddNewUserFrame]
  )

  let aside = null
  let frameContents

  if (isAura) {
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
    aside = (
      <FrameAside
        title="Frame unavailable"
        subtitle="What edition are you running?"
      />
    )
    frameContents = <EnterpriseOnlyFrame command={frame.cmd} />
  } else {
    const renderedListOfUsers = userList ? makeTable(userList) : 'No users'
    frameContents = <>{renderedListOfUsers}</>
  }

  return (
    <FrameBodyTemplate
      isCollapsed={isCollapsed}
      isFullscreen={isFullscreen}
      contents={frameContents}
      aside={aside}
    />
  )
}

const mapStateToProps = (state: any) => {
  const { database } = driverDatabaseSelection(state, 'system') || {}
  const isEnterpriseEdition = isEnterprise(state)
  const isAura = isConnectedAuraHost(state)

  return {
    useSystemDb: database,
    isEnterpriseEdition,
    isAura
  }
}

export default withBus(connect(mapStateToProps, null)(UserList))
