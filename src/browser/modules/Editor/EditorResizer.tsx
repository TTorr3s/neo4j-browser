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
import React, { type JSX, useCallback, useEffect, useRef } from 'react'
import styled from 'styled-components'

const HANDLE_HEIGHT = 6
const KEYBOARD_STEP = 16

const Handle = styled.div<{ active: boolean }>`
  height: ${HANDLE_HEIGHT}px;
  margin: 0 3px;
  cursor: row-resize;
  user-select: none;
  position: relative;
  background-color: ${props =>
    props.active
      ? props.theme.frameButtonActiveBackground
      : (props.theme.frameSidebarBackground ?? 'transparent')};
  opacity: ${props => (props.active ? 1 : 0.4)};
  border-radius: 2px;
  transition: opacity 120ms ease;

  &:hover {
    opacity: 1;
  }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 2px;
    border-radius: 2px;
    background-color: ${props => props.theme.frameTitlebarText};
    opacity: 0.5;
  }
`

type Props = {
  /**
   * The editor's height right now, in px. Read at gesture start so a drag picks
   * up where auto-sizing left off instead of jumping to some preset.
   */
  getCurrentHeight: () => number
  /** Pin the editor to a height. */
  onResize: (next: number) => void
  /** Hand sizing back to the content. Bound to double-click. */
  onReset?: () => void
  ariaLabel?: string
}

export function EditorResizer({
  getCurrentHeight,
  onResize,
  onReset,
  ariaLabel = 'Resize editor'
}: Props): JSX.Element {
  const isDraggingRef = useRef(false)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)
  const [active, setActive] = React.useState(false)

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      isDraggingRef.current = true
      startYRef.current = event.clientY
      startHeightRef.current = getCurrentHeight()
      setActive(true)
      document.body.style.cursor = 'row-resize'
    },
    [getCurrentHeight]
  )

  useEffect(() => {
    function handleMove(event: MouseEvent) {
      if (!isDraggingRef.current) return
      const delta = event.clientY - startYRef.current
      onResize(startHeightRef.current + delta)
    }
    function handleUp() {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setActive(false)
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [onResize])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const base = getCurrentHeight()
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        onResize(base + KEYBOARD_STEP)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        onResize(base - KEYBOARD_STEP)
      } else if (onReset && (event.key === 'Escape' || event.key === 'Enter')) {
        event.preventDefault()
        onReset()
      }
    },
    [getCurrentHeight, onResize, onReset]
  )

  return (
    <Handle
      role="separator"
      aria-orientation="horizontal"
      aria-label={ariaLabel}
      title="Drag to resize, double-click to fit the query"
      tabIndex={0}
      active={active}
      data-testid="frame-editor-resizer"
      onMouseDown={handleMouseDown}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    />
  )
}
