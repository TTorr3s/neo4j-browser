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
import React, { useState, ChangeEvent } from 'react'
import styled from 'styled-components'

export const StyledSelect = styled.select`
  background-color: ${props => props.theme.inputBackground};
  border: ${props => props.theme.formButtonBorder};
  border-radius: 6px;
  color: ${props => props.theme.inputText};
  display: block;
  height: 38px;
  font-size: 14px;
  padding: 8px 12px;
  min-width: 120px;
  width: 100%;
  outline: none;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: ${props => props.theme.inputBackgroundHover};
    border-color: ${props => props.theme.inputBorderFocus};
  }

  &:focus {
    background-color: ${props => props.theme.inputBackgroundFocus};
    border: 2px solid ${props => props.theme.inputBorderFocus};
    box-shadow: 0 0 0 3px ${props => props.theme.inputBoxShadowFocus};
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
`
export const StyledInput = styled.input`
  background-color: ${props => props.theme.inputBackground};
  border: ${props => props.theme.formButtonBorder};
  border-radius: 6px;
  color: ${props => props.theme.inputText};
  display: block;
  height: 38px;
  font-size: 14px;
  padding: 8px 12px;
  width: 100%;
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

  &[type='checkbox'] {
    display: inline-block;
    margin-right: 5px;
    vertical-align: middle;
    width: auto;
    height: auto;
  }
`

export const StyledForm = styled.form`
  width: 100%;
`

export const StyledFormElement = styled.div`
  margin: 0 0 10px 0;
`

export const StyledFormElementWrapper = styled.div`
  display: flex;
  > div {
    flex-grow: 1;
    &:not(:last-child) {
      margin-right: 10px;
    }
  }
`

const StyledSettingTextInput = styled(StyledInput)`
  height: 38px;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 6px;
  width: 192px;
`

const StyledCheckbox = styled.input`
  margin-right: 10px;
  width: 18px;
  height: 18px;
  accent-color: ${props => props.theme.inputBorderFocus};
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }

  &:focus {
    outline: 2px solid ${props => props.theme.inputBorderFocus};
    outline-offset: 2px;
  }
`
const StyledRadio = styled.input`
  margin-right: 10px;
  width: 18px;
  height: 18px;
  accent-color: ${props => props.theme.inputBorderFocus};
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }

  &:focus {
    outline: 2px solid ${props => props.theme.inputBorderFocus};
    outline-offset: 2px;
  }
`
export const StyledLabel = styled.label`
  /* margin-left: 10px; */
  display: inline-block;
  font-weight: 600;
  vertical-align: middle;

  input[type='radio'] + & {
    font-weight: 400;
  }

  &:first-letter {
    text-transform: uppercase;
  }
`
const StyledRadioEntry = styled.div`
  margin: 10px 0;
  display: flex;
  align-items: center;
  color: ${props => props.theme.drawerText};
`

export const CheckboxSelector = (props: any) => (
  <StyledCheckbox type="checkbox" {...props} />
)

interface RadioSelectorProps {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  options: string[]
  selectedValue?: string
}

export function RadioSelector({
  onChange,
  options,
  selectedValue: initialSelectedValue
}: RadioSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(
    initialSelectedValue ?? null
  )

  return (
    <form>
      {options.map((option: string) => (
        <StyledRadioEntry key={option}>
          <StyledRadio
            type="radio"
            value={option}
            id={option}
            checked={option === selectedValue}
            onChange={event => {
              setSelectedValue(option)
              onChange?.(event)
            }}
          />
          <StyledLabel htmlFor={option}>{option}</StyledLabel>
        </StyledRadioEntry>
      ))}
    </form>
  )
}
