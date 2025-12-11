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
import React from 'react'
import styled from 'styled-components'

import { PlainPlayIcon } from 'browser-components/icons/LegacyIcons'

export const StyledTable = styled.table``
export const StyledKey = styled.td`
  text-align: right;
  padding-right: 13px;
  width: 100px;
  color: ${props => props.theme.drawerTextMuted};
  font-family: ${props => props.theme.primaryFontFamily};
`
export const StyledValue = styled.td`
  font-family: ${props => props.theme.primaryFontFamily};
  color: ${props => props.theme.drawerText};
`

export const StyledValueUCFirst = styled(StyledValue)`
  &:first-letter {
    text-transform: uppercase;
  }
`

const StyledLink = styled.a`
  cursor: pointer;
  color: ${props => props.theme.link};
  &:hover {
    color: ${props => props.theme.linkHover};
    text-decoration: none;
  }
`
export const Link = (props: any) => {
  const { children, ...rest } = props
  return (
    <StyledLink {...rest}>
      <PlainPlayIcon />
      &nbsp;
      {children}
    </StyledLink>
  )
}
