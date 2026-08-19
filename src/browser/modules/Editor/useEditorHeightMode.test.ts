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
import { act, renderHook } from '@testing-library/react'

import { presetEditorHeight, useEditorHeightMode } from './useEditorHeightMode'

const ORIGINAL_INNER_HEIGHT = window.innerHeight

function setViewportHeight(height: number) {
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    writable: true,
    configurable: true
  })
}

describe('useEditorHeightMode', () => {
  beforeEach(() => setViewportHeight(1000))
  afterAll(() => setViewportHeight(ORIGINAL_INNER_HEIGHT))

  test('starts in auto mode', () => {
    const { result } = renderHook(() => useEditorHeightMode())

    expect(result.current.mode).toBe('auto')
    expect(result.current.fixedHeight).toBeNull()
    expect(result.current.isFixed).toBe(false)
  })

  test('setting a height by hand switches to fixed mode', () => {
    const { result } = renderHook(() => useEditorHeightMode())

    act(() => result.current.setManualHeight(320))

    expect(result.current.mode).toBe('fixed')
    expect(result.current.fixedHeight).toBe(320)
  })

  test('resetToAuto hands sizing back to the content', () => {
    const { result } = renderHook(() => useEditorHeightMode())

    act(() => result.current.setManualHeight(320))
    act(() => result.current.resetToAuto())

    expect(result.current.mode).toBe('auto')
    expect(result.current.fixedHeight).toBeNull()
  })

  test('clamps a drag below the floor', () => {
    const { result } = renderHook(() => useEditorHeightMode())

    act(() => result.current.setManualHeight(-200))

    expect(result.current.fixedHeight).toBe(80)
  })

  test('clamps a drag past 85% of the viewport', () => {
    const { result } = renderHook(() => useEditorHeightMode())

    act(() => result.current.setManualHeight(5000))

    expect(result.current.fixedHeight).toBe(850)
  })

  test('togglePreset jumps to the preset and back to auto', () => {
    const { result } = renderHook(() => useEditorHeightMode())

    act(() => result.current.togglePreset())
    expect(result.current.mode).toBe('fixed')
    expect(result.current.fixedHeight).toBe(presetEditorHeight())

    act(() => result.current.togglePreset())
    expect(result.current.mode).toBe('auto')
  })

  test('state is per-instance, so one editor cannot pin another', () => {
    const first = renderHook(() => useEditorHeightMode())
    const second = renderHook(() => useEditorHeightMode())

    act(() => first.result.current.setManualHeight(400))

    expect(first.result.current.mode).toBe('fixed')
    expect(second.result.current.mode).toBe('auto')
  })

  test('nothing is written to localStorage', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useEditorHeightMode())

    act(() => result.current.setManualHeight(400))

    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })
})
