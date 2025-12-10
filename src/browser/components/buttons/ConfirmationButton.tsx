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
import React, { useState } from 'react'
import styled from 'styled-components'

import { CancelIcon, MinusIcon, RightArrowIcon } from '../icons/LegacyIcons'

const IconButton = styled.button`
  margin-left: 4px;
  border: 0;
  background: transparent;
  &:focus {
    outline: none;
  }
`

interface ConfirmationButtonProps {
  onConfirmed: () => void
  confirmIcon?: JSX.Element
  cancelIcon?: JSX.Element
  requestIcon?: JSX.Element
}

export function ConfirmationButton({
  onConfirmed,
  confirmIcon = <RightArrowIcon />,
  cancelIcon = <CancelIcon />,
  requestIcon = <MinusIcon />
}: ConfirmationButtonProps) {
  const [requested, setRequested] = useState(false)

  if (requested) {
    return (
      <span>
        <IconButton
          data-testid="confirmation-button-confirm"
          onClick={() => {
            setRequested(false)
            onConfirmed()
          }}
        >
          {confirmIcon}
        </IconButton>
        <IconButton
          data-testid="confirmation-button-cancel"
          onClick={() => setRequested(false)}
        >
          {cancelIcon}
        </IconButton>
      </span>
    )
  }

  return (
    <IconButton
      data-testid="confirmation-button-initial"
      onClick={() => setRequested(true)}
    >
      {requestIcon}
    </IconButton>
  )
}
