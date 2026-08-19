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
import { editor } from 'monaco-editor/editor/editor.api'

import { initalizeCypherSupport, setEditorTheme } from './editorSupport'

describe('editorSupport themes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('registers concrete Monaco themes and applies the initial theme', () => {
    initalizeCypherSupport(undefined, 'nord')

    expect(editor.defineTheme).toHaveBeenCalledWith(
      'normal',
      expect.objectContaining({ base: 'vs' })
    )
    expect(editor.defineTheme).toHaveBeenCalledWith(
      'nord',
      expect.objectContaining({ base: 'vs-dark' })
    )
    expect(editor.defineTheme).toHaveBeenCalledWith(
      'solarizedLight',
      expect.objectContaining({ base: 'vs' })
    )
    expect(editor.defineTheme).toHaveBeenCalledWith(
      'beardedOled',
      expect.objectContaining({ base: 'vs-dark' })
    )
    expect(editor.defineTheme).toHaveBeenCalledWith(
      'beardedMelleJulietLight',
      expect.objectContaining({ base: 'vs' })
    )
    expect(editor.setTheme).toHaveBeenCalledWith('nord')
  })

  it('applies concrete theme ids and keeps light as a legacy alias', () => {
    setEditorTheme('beardedVividBlack')
    expect(editor.setTheme).toHaveBeenCalledWith('beardedVividBlack')

    setEditorTheme('light')
    expect(editor.setTheme).toHaveBeenCalledWith('normal')
  })
})
