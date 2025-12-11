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
import React, { useState, useCallback } from 'react'
import { connect } from 'react-redux'

import FrameBodyTemplate from '../../Frame/FrameBodyTemplate'
import FrameError from '../../Frame/FrameError'
import ConnectionFormController from './ConnectionFormController'
import { StyledConnectionAside } from './styled'
import { Lead } from 'browser-components/Text'
import { H3 } from 'browser-components/headers'
import { getActiveConnection } from 'shared/modules/connections/connectionsDuck'

interface ChangePasswordFrameProps {
  isCollapsed: boolean
  isFullscreen: boolean
  frame: {
    connectionData?: Record<string, unknown>
  }
  activeConnection: string | null
}

interface ChangePasswordFrameState {
  error: { code?: string; message?: string }
  success: boolean
}

function ChangePasswordFrame(props: ChangePasswordFrameProps) {
  const [state, setState] = useState<ChangePasswordFrameState>({
    error: {},
    success: false
  })

  const handleError = useCallback((e: { code?: string; message?: string }) => {
    if (e.code === 'N/A') {
      e.message = 'Existing password is incorrect'
    }
    setState(prev => ({ ...prev, error: e }))
  }, [])

  const handleSuccess = useCallback(() => {
    setState(prev => ({ ...prev, success: true }))
  }, [])

  const content = (
    <>
      <StyledConnectionAside>
        <H3>Password change</H3>
        {state.success ? (
          <Lead>Password change successful</Lead>
        ) : (
          <Lead>
            {props.activeConnection
              ? 'Enter your current password and the new twice to change your password.'
              : 'Please connect to a database to change the password.'}
          </Lead>
        )}
      </StyledConnectionAside>

      {props.activeConnection && (
        <ConnectionFormController
          {...props}
          error={handleError}
          onSuccess={handleSuccess}
          forcePasswordChange
          showExistingPasswordInput
        />
      )}
    </>
  )

  return (
    <FrameBodyTemplate
      isCollapsed={props.isCollapsed}
      isFullscreen={props.isFullscreen}
      statusBar={
        <FrameError code={state.error.code} message={state.error.message} />
      }
      contents={content}
    />
  )
}

const mapStateToProps = (state: any) => {
  return {
    activeConnection: getActiveConnection(state)
  }
}

export default connect(mapStateToProps, () => ({}))(ChangePasswordFrame)
