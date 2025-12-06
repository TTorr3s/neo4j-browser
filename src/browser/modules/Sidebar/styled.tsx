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
  display: inline-block;
`
export const StyledErrorListContainer = styled.div`
  margin-left: 24px;
  color: #ffaf00;
`

export const StyledSettingTextInput = styled.input`
  height: 34px;
  color: #555;
  font-size: 14px;
  padding: 6px 12px;
  background-color: #ffffff;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 192px;
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
`

export const StyledFullSizeDrawerBody = styled(DrawerBody)`
  padding: 0 0 12px 0;
`

export const StyledHeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  a {
    cursor: pointer;
    margin-right: 10px;

    .Canny_BadgeContainer .Canny_Badge {
      position: absolute;
      top: -1px;
      right: -1px;
      border-radius: 10px;
      background-color: #df4d3b;
      padding: 4px;
      border: 1px solid #df4d3b;
    }
  }
`

export const StyledFeedbackButton = styled.button`
  background: #55acee;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: fit-content;
  margin: 0 0 25px 25px;
  min-height: fit-content;
  outline: 0;
  border: none;
  vertical-align: baseline;
  font-family: 'Open Sans', 'Helvetica Neue', Arial, Helvetica, sans-serif;
  padding: 0.78571429em 1.5em 0.78571429em;
  font-size: 1rem;
  line-height: 1em;
  border-radius: 0.28571429rem;

  :hover {
    background-color: #35a2f4;
  }

  :active {
    background-color: #2795e9;
  }
`

export const StyledCommand = styled(DrawerBrowserCommand)`
  max-width: 45%;
`
