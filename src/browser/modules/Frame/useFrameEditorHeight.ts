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

const STORAGE_KEY = 'neo4j.frameEditorHeight'

export const FRAME_EDITOR_MIN_HEIGHT = 60
export const FRAME_EDITOR_MAX_HEIGHT_RATIO = 0.85

export function readStoredFrameEditorHeight(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

function persistFrameEditorHeight(height: number | null): void {
  try {
    if (height === null) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(height))
    }
  } catch {
    // localStorage can fail (private mode, quota); we keep the in-memory state.
  }
}

export function clampFrameEditorHeight(height: number): number {
  const maxHeight = Math.floor(
    window.innerHeight * FRAME_EDITOR_MAX_HEIGHT_RATIO
  )
  return Math.min(Math.max(FRAME_EDITOR_MIN_HEIGHT, height), maxHeight)
}

export type FrameEditorHeightApi = {
  height: number | null
  setHeight: (height: number | null) => void
  reset: () => void
}

export function useFrameEditorHeight(): FrameEditorHeightApi {
  const [height, setHeightState] = useState<number | null>(
    readStoredFrameEditorHeight
  )

  const setHeight = useCallback((next: number | null) => {
    const value = next === null ? null : clampFrameEditorHeight(next)
    setHeightState(value)
    persistFrameEditorHeight(value)
  }, [])

  const reset = useCallback(() => {
    setHeightState(null)
    persistFrameEditorHeight(null)
  }, [])

  return { height, setHeight, reset }
}
