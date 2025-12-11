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
import { primaryLightColor } from 'browser-styles/themes'

export const Drawer = styled.div`
  width: 100%;
  min-width: 350px;
  display: flex;
  flex-direction: column;
  height: 100vh;
`

export const DrawerCompanyLogo = styled.div`
  width: 100px;
  height: 130px;
  margin: 10px auto;
  display: block;
  padding-top: 20px;
`

export const DrawerHeader = styled.h4`
  color: ${props => props.theme.drawerHeaderText};
  background-color: ${props => props.theme.frameCommandBackground};
  font-size: 18px;
  height: 73px;
  padding: 25px 0 0 18px;
  position: relative;
  font-weight: bold;
  -webkit-font-smoothing: antialiased;
  font-family: ${props => props.theme.drawerHeaderFontFamily};
`

export const DrawerToppedHeader = styled(DrawerHeader)`
  padding-top: 8px;
`

export const DrawerSubHeader = styled.h5`
  color: ${props => props.theme.drawerText};
  border-bottom: ${props => props.theme.drawerSeparator};
  font-size: 14px;
  margin-bottom: 0;
  line-height: 39px;
  position: relative;
  font-weight: bold;
  -webkit-font-smoothing: antialiased;
  font-family: ${props => props.theme.drawerHeaderFontFamily};
`

export const DrawerSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const DrawerSectionBody = styled.div`
  font-family: ${props => props.theme.primaryFontFamily};
  font-weight: normal;
  color: ${props => props.theme.drawerText};
`

export const DrawerBody = styled.div`
  padding: 0 24px 12px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const DrawerFooter = styled.div`
  margin-bottom: 20px;
  text-align: center;
  color: ${props => props.theme.drawerTextMuted};
`

export const DrawerExternalLink = styled.a.attrs({
  target: '_blank',
  rel: 'noreferrer'
})`
  cursor: pointer;
  text-decoration: none;
  color: ${primaryLightColor};

  &:active {
    text-decoration: none;
  }
`

export const DrawerBrowserCommand = styled.span.attrs({
  className: 'remove-play-icon'
})`
  background-color: ${props => props.theme.drawerCommandBackground};
  border-radius: 2px;
  padding: 3px;

  color: ${props => props.theme.drawerCommandText};
  font-family: Fira Code;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
`
