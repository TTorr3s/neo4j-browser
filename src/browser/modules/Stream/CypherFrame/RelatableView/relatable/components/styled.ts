/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 * This file is part of Neo4j.
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
import styled, { css } from 'styled-components'

/**
 * Styled Label component to replace semantic-ui-react Label.
 * Used for displaying counts/badges in toolbars and row numbers in tables.
 */
export const Label = styled.span`
  display: inline-block;
  line-height: 1;
  vertical-align: baseline;
  margin: 0 0.14285714em;
  background-color: #e8e8e8;
  background-image: none;
  padding: 0.5833em 0.833em;
  color: rgba(0, 0, 0, 0.6);
  text-transform: none;
  font-weight: 700;
  border: 0 solid transparent;
  border-radius: 0.28571429rem;
  transition: background 0.1s ease;
  font-size: 0.85714286rem;
`

/**
 * A horizontal divider/separator component.
 * Replaces semantic-ui-react Divider for React 19 compatibility.
 */
export const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(34, 36, 38, 0.15);
  margin: 1rem 0;
  height: 0;
  font-size: 0;
  line-height: 0;
`

export interface ToolbarButtonProps {
  $basic?: boolean
  $icon?: boolean
  $color?: 'black' | 'grey' | 'blue' | 'green' | 'red'
}

const colorStyles = {
  black: css`
    color: rgba(0, 0, 0, 0.6);
    &:hover:not(:disabled) {
      color: rgba(0, 0, 0, 0.8);
      background-color: rgba(0, 0, 0, 0.05);
    }
  `,
  grey: css`
    color: rgba(0, 0, 0, 0.5);
    &:hover:not(:disabled) {
      color: rgba(0, 0, 0, 0.7);
      background-color: rgba(0, 0, 0, 0.05);
    }
  `,
  blue: css`
    color: #2185d0;
    &:hover:not(:disabled) {
      color: #1678c2;
      background-color: rgba(33, 133, 208, 0.05);
    }
  `,
  green: css`
    color: #21ba45;
    &:hover:not(:disabled) {
      color: #16ab39;
      background-color: rgba(33, 186, 69, 0.05);
    }
  `,
  red: css`
    color: #db2828;
    &:hover:not(:disabled) {
      color: #d01919;
      background-color: rgba(219, 40, 40, 0.05);
    }
  `
}

/**
 * Styled Button component to replace semantic-ui-react Button.
 * Supports basic, icon, and color props.
 */
export const ToolbarButton = styled.button<ToolbarButtonProps>`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1em;
  outline: 0;
  border: none;
  vertical-align: baseline;
  background: transparent;
  padding: 0.78571429em 1em;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1em;
  text-align: center;
  text-decoration: none;
  border-radius: 0.28571429rem;
  user-select: none;
  transition:
    opacity 0.1s ease,
    background-color 0.1s ease,
    color 0.1s ease,
    box-shadow 0.1s ease,
    background 0.1s ease;

  /* Basic style - transparent background with border */
  ${props =>
    props.$basic &&
    css`
      background: transparent;
      box-shadow: 0 0 0 1px rgba(34, 36, 38, 0.15) inset;
    `}

  /* Icon-only button - compact padding */
  ${props =>
    props.$icon &&
    css`
      padding: 0.78571429em;
    `}

  /* Color variations */
  ${props => props.$color && colorStyles[props.$color]}

  /* Disabled state */
  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    pointer-events: none;
  }

  /* Icon styling within button */
  svg,
  i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 1em;
    width: 1em;
    font-size: 1em;
    opacity: 0.9;
  }

  /* Text with icon spacing */
  svg + span,
  i + span,
  span + svg,
  span + i {
    margin-left: 0.5em;
  }
`

/**
 * Styled checkbox to replace semantic-ui-react Checkbox.
 */
export const StyledCheckbox = styled.input`
  cursor: pointer;
  width: 17px;
  height: 17px;
  margin: 0;
  accent-color: #2684ff;
`

/**
 * CSS-based caret icon for expand/collapse.
 */
export const CaretIcon = styled.span<{ $expanded: boolean }>`
  display: inline-block;
  width: 0;
  height: 0;
  border-style: solid;
  ${props =>
    props.$expanded
      ? `
    border-width: 6px 5px 0 5px;
    border-color: #666 transparent transparent transparent;
  `
      : `
    border-width: 5px 0 5px 6px;
    border-color: transparent transparent transparent #666;
  `}
`

/**
 * Styled input for filters to replace semantic-ui-react FormInput.
 */
export const FilterInput = styled.input`
  font-family: inherit;
  margin: 0;
  outline: 0;
  -webkit-appearance: none;
  line-height: 1.21428571em;
  padding: 0.67857143em 1em;
  font-size: 1em;
  background: #fff;
  border: 1px solid rgba(34, 36, 38, 0.15);
  color: rgba(0, 0, 0, 0.87);
  border-radius: 0.28571429rem;
  box-shadow: 0 0 0 0 transparent inset;
  transition:
    color 0.1s ease,
    border-color 0.1s ease;

  &:focus {
    color: rgba(0, 0, 0, 0.95);
    border-color: #85b7d9;
    background: #fff;
    box-shadow: 0 0 0 0 rgba(34, 36, 38, 0.35) inset;
  }

  &::placeholder {
    color: rgba(0, 0, 0, 0.4);
  }
`

/**
 * Form components to replace semantic-ui-react Form, Form.Field, Form.Group
 */
export const Form = styled.form`
  position: relative;
  max-width: 100%;
  font-size: 1rem;
`

export const FormField = styled.div`
  clear: both;
  margin: 0 0 1em;

  &:last-child {
    margin-bottom: 0;
  }
`

export const FormGroup = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.5em;

  & > ${FormField} {
    flex: 0 1 auto;
    margin: 0;
  }
`

/**
 * Styled select component to replace semantic-ui-react FormSelect.
 * Supports search functionality via datalist.
 */
export interface StyledSelectProps {
  $inline?: boolean
}

export const SelectWrapper = styled.div<StyledSelectProps>`
  display: ${props => (props.$inline ? 'inline-flex' : 'flex')};
  flex-direction: ${props => (props.$inline ? 'row' : 'column')};
  align-items: ${props => (props.$inline ? 'center' : 'stretch')};
  gap: 0.5em;
`

export const SelectLabel = styled.label`
  font-size: 0.92857143em;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.87);
  text-transform: none;
`

export const StyledSelect = styled.select`
  cursor: pointer;
  display: block;
  outline: 0;
  border: 1px solid rgba(34, 36, 38, 0.15);
  background: #fff;
  color: rgba(0, 0, 0, 0.87);
  padding: 0.67857143em 2.1em 0.67857143em 1em;
  font-size: 1em;
  line-height: 1.21428571em;
  border-radius: 0.28571429rem;
  transition:
    border-color 0.1s ease,
    box-shadow 0.1s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.7em center;
  background-size: 1em;
  min-width: 120px;

  &:hover {
    border-color: rgba(34, 36, 38, 0.35);
  }

  &:focus {
    border-color: #85b7d9;
    box-shadow: 0 0 0 0 rgba(34, 36, 38, 0.35) inset;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/**
 * Menu components to replace semantic-ui-react Menu and Menu.Item
 */
export const Menu = styled.nav`
  display: flex;
  margin: 1rem 0;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 400;
  background: transparent;
  border: none;
  box-shadow: none;
`

export interface MenuItemProps {
  $disabled?: boolean
  $active?: boolean
}

export const MenuItem = styled.a<MenuItemProps>`
  display: flex;
  align-items: center;
  gap: 0.5em;
  position: relative;
  vertical-align: middle;
  line-height: 1;
  text-decoration: none;
  user-select: none;
  background: transparent;
  padding: 0.92857143em 1.14285714em;
  text-transform: none;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 400;
  cursor: pointer;
  transition:
    background 0.1s ease,
    color 0.1s ease,
    opacity 0.1s ease;
  border-radius: 0.28571429rem;

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(0, 0, 0, 0.95);
  }

  ${props =>
    props.$active &&
    css`
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.95);
      font-weight: 700;
    `}

  ${props =>
    props.$disabled &&
    css`
      cursor: not-allowed;
      opacity: 0.45;
      pointer-events: none;
    `}

  /* Icon styling */
  svg {
    width: 1.18em;
    height: 1.18em;
    opacity: 0.9;
  }
`
