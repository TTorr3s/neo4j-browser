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
import { type JSX } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerSection,
  DrawerSectionBody
} from 'browser-components/drawer/drawer-styled'
import { getThemePreset, themePresets } from 'browser-styles/themes'
import { GlobalState } from 'shared/globalState'
import { ThemeId, getTheme, update } from 'shared/modules/settings/settingsDuck'

const ThemeList = styled.div.attrs({
  role: 'radiogroup',
  'aria-label': 'Themes'
})`
  display: grid;
  gap: 10px;
`

const ThemeOption = styled.button<{ $selected: boolean }>`
  width: 100%;
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid
    ${props =>
      props.$selected
        ? props.theme.inputBorderFocus
        : props.theme.drawerSeparator?.replace('1px solid ', '') ||
          props.theme.drawerTextMuted};
  border-radius: 8px;
  background: ${props =>
    props.$selected
      ? props.theme.hoverBackground
      : props.theme.inputBackground};
  color: ${props => props.theme.drawerText};
  text-align: left;
  cursor: pointer;
  box-shadow: ${props =>
    props.$selected ? `0 0 0 2px ${props.theme.inputBoxShadowFocus}` : 'none'};

  &:hover {
    background: ${props => props.theme.hoverBackground};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.inputBorderFocus};
    outline-offset: 2px;
  }
`

const ThemeOptionHeader = styled.span`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const ThemeStateDot = styled.span<{ $selected: boolean }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex: 0 0 16px;
  border: 2px solid
    ${props =>
      props.$selected
        ? props.theme.inputBorderFocus
        : props.theme.drawerTextMuted};
  background: ${props =>
    props.$selected ? props.theme.inputBorderFocus : 'transparent'};
  box-shadow: inset 0 0 0 3px ${props => props.theme.inputBackground};
`

const ThemeName = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
`

const ThemeMode = styled.span`
  flex: 0 0 auto;
  color: ${props => props.theme.drawerTextMuted};
  font-size: 12px;
  text-transform: capitalize;
`

const SwatchList = styled.span`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
`

const Swatch = styled.span<{ $color: string }>`
  display: block;
  height: 24px;
  border-radius: 4px;
  background: ${props => props.$color};
  border: 1px solid rgba(0, 0, 0, 0.2);
`

type ThemesDrawerProps = {
  selectedTheme: ThemeId
  onThemeSelect: (theme: ThemeId) => void
}

const modeLabel: Record<string, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark'
}

export const ThemesDrawer = ({
  selectedTheme,
  onThemeSelect
}: ThemesDrawerProps): JSX.Element => {
  const selectedPreset = getThemePreset(selectedTheme)

  return (
    <Drawer id="db-themes">
      <DrawerHeader>Themes</DrawerHeader>
      <DrawerBody>
        <DrawerSection>
          <DrawerSectionBody>
            <ThemeList>
              {themePresets.map(preset => {
                const selected = preset.id === selectedPreset.id
                return (
                  <ThemeOption
                    key={preset.id}
                    $selected={selected}
                    role="radio"
                    aria-checked={selected}
                    data-testid={`theme-option-${preset.id}`}
                    type="button"
                    onClick={() => onThemeSelect(preset.id)}
                  >
                    <ThemeOptionHeader>
                      <ThemeStateDot $selected={selected} />
                      <ThemeName>{preset.displayName}</ThemeName>
                      <ThemeMode>{modeLabel[preset.mode]}</ThemeMode>
                    </ThemeOptionHeader>
                    <SwatchList aria-hidden="true">
                      {preset.previewSwatches.map((color, index) => (
                        <Swatch
                          key={`${preset.id}-${color}-${index}`}
                          $color={color}
                        />
                      ))}
                    </SwatchList>
                  </ThemeOption>
                )
              })}
            </ThemeList>
          </DrawerSectionBody>
        </DrawerSection>
      </DrawerBody>
    </Drawer>
  )
}

const mapStateToProps = (state: GlobalState) => ({
  selectedTheme: getTheme(state)
})

const mapDispatchToProps = (dispatch: any) => ({
  onThemeSelect: (theme: ThemeId) => dispatch(update({ theme }))
})

export default connect(mapStateToProps, mapDispatchToProps)(ThemesDrawer)
