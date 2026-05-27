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
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { ThemesDrawer } from './Themes'
import { themePresets } from 'browser-styles/themes'
import {
  NORD_THEME,
  SOLARIZED_LIGHT_THEME
} from 'shared/modules/settings/settingsDuck'

describe('ThemesDrawer', () => {
  it('renders every preset and marks the selected theme', () => {
    render(
      <ThemesDrawer selectedTheme={NORD_THEME} onThemeSelect={jest.fn()} />
    )

    themePresets.forEach(preset => {
      expect(
        screen.getByTestId(`theme-option-${preset.id}`)
      ).toBeInTheDocument()
    })

    expect(screen.getByTestId(`theme-option-${NORD_THEME}`)).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  it('emits the selected theme id', () => {
    const onThemeSelect = jest.fn()
    render(
      <ThemesDrawer selectedTheme={NORD_THEME} onThemeSelect={onThemeSelect} />
    )

    fireEvent.click(screen.getByTestId(`theme-option-${SOLARIZED_LIGHT_THEME}`))

    expect(onThemeSelect).toHaveBeenCalledWith(SOLARIZED_LIGHT_THEME)
  })
})
