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
import { MonacoThemeId, getMonacoThemes } from './CypherMonacoThemes'

describe('getMonacoThemes', () => {
  it('returns one Monaco theme per concrete Browser theme', () => {
    const themes = getMonacoThemes()
    const themeIds: MonacoThemeId[] = [
      'normal',
      'outline',
      'dark',
      'nord',
      'solarizedLight',
      'beardedVividBlack',
      'beardedOled',
      'beardedMelleJulietLight'
    ]

    expect(Object.keys(themes).sort()).toEqual([...themeIds].sort())
    themeIds.forEach(themeId => {
      expect(themes[themeId].base).toBeTruthy()
      expect(themes[themeId].rules.length).toBeGreaterThan(0)
      expect(themes[themeId].colors['editor.background']).toBeTruthy()
      expect(themes[themeId].colors['editor.foreground']).toBeTruthy()
    })
  })

  it('uses dedicated colors for nord and solarized light', () => {
    const themes = getMonacoThemes()

    expect(themes.nord.colors['editor.background']).toEqual('#2E3440')
    expect(themes.solarizedLight.colors['editor.background']).toEqual('#FDF6E3')
  })

  it('uses dedicated colors for bearded presets', () => {
    const themes = getMonacoThemes()

    expect(themes.beardedVividBlack.colors['editor.background']).toEqual(
      '#141417'
    )
    expect(themes.beardedOled.colors['editor.background']).toEqual('#000000')
    expect(themes.beardedMelleJulietLight.colors['editor.background']).toEqual(
      '#edeeee'
    )
  })
})
