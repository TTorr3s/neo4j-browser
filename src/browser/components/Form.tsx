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
import React, { Component } from 'react'
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
    box-shadow: 0 0 0 3px ${props => props.theme.inputBorderFocus}22;
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
    box-shadow: 0 0 0 3px ${props => props.theme.inputBorderFocus}22;
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
`
const StyledRadio = styled.input`
  margin-right: 10px;
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
`

export const CheckboxSelector = (props: any) => (
  <StyledCheckbox type="checkbox" {...props} />
)

type RadioSelectorState = any

export class RadioSelector extends Component<
  { onChange?: any; options: any[]; selectedValue?: string },
  RadioSelectorState
> {
  state: RadioSelectorState = {}
  constructor(props: {} = { options: [] }) {
    super(props as any)
    this.state.selectedValue = this.props.selectedValue || null
  }

  isSelectedValue(option: any) {
    return option === this.state.selectedValue
  }

  render() {
    return (
      <form>
        {this.props.options.map((option: any) => {
          return (
            <StyledRadioEntry key={option}>
              <StyledRadio
                type="radio"
                value={option}
                id={option}
                checked={this.isSelectedValue(option)}
                onChange={event => {
                  this.setState({ selectedValue: option })
                  this.props.onChange(event)
                }}
              />
              <StyledLabel htmlFor={option}>{option}</StyledLabel>
            </StyledRadioEntry>
          )
        })}
      </form>
    )
  }
}
