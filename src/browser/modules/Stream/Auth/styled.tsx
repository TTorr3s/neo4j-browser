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

import { StyledInput, StyledSelect } from 'browser-components/Form'

export const StyledConnectionForm = styled.form`
  padding: 0 15px;
  flex: 1;
  max-width: 500px;

  &.isLoading {
    opacity: 0.5;
  }
`
export const StyledChangePasswordForm = styled(StyledConnectionForm)`
  flex: 1;
`

export const StyledConnectionAside = styled.div`
  font-family: ${props => props.theme.primaryFontFamily};
  font-size: 16px;
  font-weight: 300;
  color: ${props => props.theme.asideText};
  padding: 0 15px 10px;
  text-align: center;
`
export const StyledConnectionFormEntry = styled.div`
  padding-bottom: 15px;
`
export const StyledConnectionLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 2;
  * {
    font-weight: normal;
  }
`
export const StyledConnectionTextInput = styled(StyledInput)`
  width: 100%;
`

export const StyledSegment = styled.div`
  width: 100%;
  position: relative;
  display: flex;
  justify-content: left;

  > select {
    border-radius: 6px;
    width: auto;
    min-width: unset;
    display: inline-block;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    text-align: right;
    background-color: ${props => props.theme.inputBackground};
    border: ${props => props.theme.formButtonBorder};
    color: ${props => props.theme.inputText};
    height: 38px;
    font-size: 14px;
    padding: 8px 12px;
    vertical-align: bottom;
    outline: none;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
      background-color: ${props => props.theme.inputBackgroundHover};
      border-color: ${props => props.theme.inputBorderFocus};
    }

    &:focus {
      background-color: ${props => props.theme.inputBackgroundFocus};
      border-color: ${props => props.theme.inputBorderFocus};
      box-shadow: 0 0 0 2px ${props => props.theme.inputBoxShadowFocus};
    }

    option {
      background-color: ${props => props.theme.secondaryBackground};
      color: ${props => props.theme.inputText};
      padding: 8px 12px;
    }

    option:hover,
    option:focus,
    option:checked {
      background-color: ${props => props.theme.inputBackgroundHover};
    }
  }

  > input {
    display: inline-block;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    margin-left: -1px;
    flex: 1;
    min-width: unset;
    width: auto;
  }
`

export const StyledCredentialsRow = styled.div`
  display: flex;
  gap: 12px;

  > div {
    flex: 1;
    min-width: 0;
  }

  @media (max-width: 500px) {
    flex-direction: column;
    gap: 0;
  }
`

export const StyledProfileRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;

  > div:first-child {
    flex: 1;
  }
`

export const StyledProfileAddButton = styled.button`
  background: transparent;
  border: ${props => props.theme.formButtonBorder};
  border-radius: 6px;
  color: ${props => props.theme.secondaryText};
  height: 38px;
  width: 38px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background-color: ${props => props.theme.inputBackgroundHover};
    border-color: ${props => props.theme.inputBorderFocus};
    color: ${props => props.theme.primaryText};
  }
`

export const StyledSaveProfileRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;

  > input {
    flex: 1;
  }
`

export const StyledAuthToggle = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.link};
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  margin-top: 12px;

  &:hover {
    text-decoration: underline;
  }
`

export const StyledDeleteProfileAction = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
`

export const StyledDeleteLink = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.secondaryText};
  font-size: 12px;
  cursor: pointer;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`

export const StyledDeleteConfirm = styled.span`
  color: ${props => props.theme.secondaryText};

  > button {
    background: transparent;
    border: none;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
    margin: 0 4px;
  }
`

export const StyledDeleteConfirmYes = styled.button`
  color: ${props => props.theme.error};

  &:hover {
    text-decoration: underline;
  }
`

export const StyledDeleteConfirmNo = styled.button`
  color: ${props => props.theme.link};

  &:hover {
    text-decoration: underline;
  }
`

export const StyledConnectButton = styled.button`
  color: ${props => props.theme.primaryButtonText};
  background-color: ${props => props.theme.primary};
  border: 1px solid ${props => props.theme.primary};
  font-family: ${props => props.theme.primaryFontFamily};
  padding: 10px 18px;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 6px;
  line-height: 20px;
  width: 100%;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.primary50};
    border-color: ${props => props.theme.primary50};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

export const StyledFormSection = styled.div`
  border-top: 1px solid ${props => props.theme.formButtonBorder};
  padding-top: 12px;
  margin-top: 4px;
`

export const StyledSectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: ${props => props.theme.secondaryText};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`

export const StyledRevealablePasswordWrapper = styled.div`
  position: relative;
  display: inline-block;
  width: calc(44% + 30px);
  min-width: 200px;

  > input {
    width: calc(100% - 30px);
  }
`

export const StyledRevealIconWrapper = styled.div`
  width: 25px;
  color: ${props => props.theme.primaryText};
  position: absolute;
  user-select: none;
  right: 0;
  top: 5px;
  height: auto;
  padding: 3px;
`

export const StyledConnectionSelect = styled(StyledSelect)`
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  padding-right: 36px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%239195a0' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
`

export const StyledConnectionBodyContainer = styled.div`
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
`
export const StyledConnectionBody = styled.div`
  flex: 1 1 auto;
  font-size: 1.3em;
  line-height: 2em;
  padding-left: 50px;
`
export const StyledConnectionFooter = styled.span`
  font-size: 0.95em;
  font-weight: 200;
`
export const StyledCode = styled.code`
  color: #e29b49ff;
  background-color: ${props => props.theme.frameSidebarBackground};
  border-radius: 2px;
  cursor: auto;
  border: none;
  padding: 2px 4px;

  a {
    color: #e29b49ff !important;
  }
`

export const StyledDbsRow = styled.li``

export const StyledConnectionFrameWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

export const StyledFormContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
`
