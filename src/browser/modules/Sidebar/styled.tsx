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
import styled from 'styled-components'

import {
  DrawerBody,
  DrawerBrowserCommand
} from 'browser-components/drawer/drawer-styled'

export const StyledSetting = styled.div`
  padding-bottom: 5px;
  padding-top: 5px;
`

export const StyledSettingLabel = styled.label`
  word-wrap: break-wrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.drawerText};
  cursor: pointer;
`
export const StyledErrorListContainer = styled.div`
  margin-left: 24px;
  color: #ffaf00;
`

export const StyledSettingTextInput = styled.input`
  height: 38px;
  color: ${props => props.theme.inputText};
  font-size: 14px;
  padding: 8px 12px;
  background-color: ${props => props.theme.inputBackground};
  border: ${props => props.theme.formButtonBorder};
  border-radius: 6px;
  width: 192px;
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: ${props => props.theme.inputPlaceholder};
  }

  &:hover {
    background-color: ${props => props.theme.inputBackgroundHover};
    border-color: ${props => props.theme.inputBorderFocus};
  }

  &:focus {
    background-color: ${props => props.theme.inputBackgroundFocus};
    border: 2px solid ${props => props.theme.inputBorderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.inputBoxShadowFocus};
  }
`

export const StyledHelpItem = styled.li`
  list-style-type: none;
  margin: 8px 24px 0 24px;
`

export const StyledCommandListItem = styled.li`
  list-style-type: none;
  cursor: pointer;
  text-decoration: none;
  -webkit-text-decoration: none;
  position: relative;

  &:hover {
    background-color: ${props => props.theme.hoverBackground};
  }
`

export const StyledCommandRowWrapper = styled.div`
  display: flex;
`

export const FlexSpacer = styled.div`
  flex: 1 1 auto;
`

export const StyledCommandRunButton = styled.button<{ hidden?: boolean }>`
  color: ${props => props.theme.primary};
  background-color: transparent;
  border: none;
  display: ${props => (props.hidden ? 'none' : 'block')};

  svg {
    display: inline-block;
    vertical-align: middle;
  }
`

export const StyledCommandNamePair = styled.div`
  flex: 0 0 auto;
  margin: 0px 0px 0px 24px;
  padding: 10px 0;
  display: flex;
  width: 85%;
`
export const StyledName = styled.div`
  width: 50%;
  margin-right: 5px;
  color: ${props => props.theme.drawerText};
`

export const StyledFullSizeDrawerBody = styled(DrawerBody)`
  padding: 0 0 12px 0;
`

export const StyledCommand = styled(DrawerBrowserCommand)`
  max-width: 45%;
`
