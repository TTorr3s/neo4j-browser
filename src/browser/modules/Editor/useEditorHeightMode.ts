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
import { useCallback, useState } from 'react'

import {
  DEFAULT_MIN_HEIGHT,
  EditorHeightMode
} from 'neo4j-arc/cypher-language-support'

/** A hand-set height may not swallow more than this share of the viewport. */
export const MANUAL_MAX_HEIGHT_RATIO = 0.85

/** Height the "extend" shortcut jumps to, matching the pre-auto-height preset. */
export const PRESET_MIN_PX = 250
export const PRESET_VIEWPORT_RATIO = 0.24

export function presetEditorHeight(): number {
  return Math.max(
    PRESET_MIN_PX,
    Math.floor(window.innerHeight * PRESET_VIEWPORT_RATIO)
  )
}

export function clampManualHeight(height: number): number {
  const maxHeight = Math.floor(window.innerHeight * MANUAL_MAX_HEIGHT_RATIO)
  return Math.min(Math.max(DEFAULT_MIN_HEIGHT, height), maxHeight)
}

export type EditorHeightApi = {
  /** `auto` until the user sets a height by hand. */
  mode: Exclude<EditorHeightMode, 'fullscreen'>
  /** Pixel height while in `fixed` mode, otherwise null. */
  fixedHeight: number | null
  /** Convenience flag for callers that only care whether a height was pinned. */
  isFixed: boolean
  /** Pin the editor to a height. Switches the mode to `fixed`. */
  setManualHeight: (height: number) => void
  /** Hand sizing back to the content. */
  resetToAuto: () => void
  /** Jump to the extended preset, or back to auto if already pinned. */
  togglePreset: () => void
}

/**
 * Editor height state machine. Deliberately per-instance and non-persistent:
 * a height pinned on one frame must not follow the user into the next one.
 */
export function useEditorHeightMode(): EditorHeightApi {
  const [fixedHeight, setFixedHeight] = useState<number | null>(null)

  const setManualHeight = useCallback((height: number) => {
    setFixedHeight(clampManualHeight(height))
  }, [])

  const resetToAuto = useCallback(() => {
    setFixedHeight(null)
  }, [])

  const togglePreset = useCallback(() => {
    setFixedHeight(current =>
      current === null ? clampManualHeight(presetEditorHeight()) : null
    )
  }, [])

  return {
    mode: fixedHeight === null ? 'auto' : 'fixed',
    fixedHeight,
    isFixed: fixedHeight !== null,
    setManualHeight,
    resetToAuto,
    togglePreset
  }
}
