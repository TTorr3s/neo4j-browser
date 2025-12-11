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
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { createPortal } from 'react-dom'
import styled, { css } from 'styled-components'

export type PopupPosition =
  | 'top left'
  | 'top center'
  | 'top right'
  | 'bottom left'
  | 'bottom center'
  | 'bottom right'
  | 'left center'
  | 'right center'

export interface PopupProps {
  /** The element that triggers the popup */
  trigger: React.ReactElement
  /** The content to display inside the popup */
  children?: React.ReactNode
  /** Alternative to children for simple content */
  content?: React.ReactNode
  /** How the popup is triggered - currently only 'click' is supported */
  on?: 'click'
  /** Control whether the popup is open (controlled mode) */
  open?: boolean
  /** Callback when the popup should close */
  onClose?: () => void
  /** Position of the popup relative to the trigger */
  position?: PopupPosition
  /** Additional CSS class name */
  className?: string
  /** Makes the popup wider */
  wide?: boolean
  /** Removes default styling (background, border, shadow) */
  basic?: boolean
  /** Offset from the calculated position [x, y] */
  offset?: [number, number]
  /** Inline styles for the popup container */
  style?: React.CSSProperties
}

interface PopupContentPosition {
  top: number
  left: number
}

const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
`

const PopupContent = styled.div<{
  $wide?: boolean
  $basic?: boolean
  $position: PopupPosition
}>`
  position: fixed;
  z-index: 1001;
  background: ${props =>
    props.$basic ? 'transparent' : props.theme.editorBackground};
  color: ${props => props.theme.primaryText};
  border: ${props => (props.$basic ? 'none' : props.theme.inFrameBorder)};
  border-radius: 4px;
  box-shadow: ${props => (props.$basic ? 'none' : props.theme.standardShadow)};
  padding: ${props => (props.$basic ? '0' : '12px')};
  max-width: ${props => (props.$wide ? '400px' : '250px')};
  min-width: 150px;

  ${props => {
    // Add arrow styles based on position
    if (props.$basic) return ''

    const arrowSize = '8px'
    const arrowColor = props.theme.editorBackground

    switch (props.$position) {
      case 'bottom left':
      case 'bottom center':
      case 'bottom right':
        return css`
          &::before {
            content: '';
            position: absolute;
            top: -${arrowSize};
            ${props.$position === 'bottom left' ? 'left: 16px' : ''};
            ${props.$position === 'bottom center'
              ? 'left: 50%; transform: translateX(-50%)'
              : ''};
            ${props.$position === 'bottom right' ? 'right: 16px' : ''};
            border-width: 0 ${arrowSize} ${arrowSize} ${arrowSize};
            border-style: solid;
            border-color: transparent transparent ${arrowColor} transparent;
          }
        `
      case 'top left':
      case 'top center':
      case 'top right':
        return css`
          &::before {
            content: '';
            position: absolute;
            bottom: -${arrowSize};
            ${props.$position === 'top left' ? 'left: 16px' : ''};
            ${props.$position === 'top center'
              ? 'left: 50%; transform: translateX(-50%)'
              : ''};
            ${props.$position === 'top right' ? 'right: 16px' : ''};
            border-width: ${arrowSize} ${arrowSize} 0 ${arrowSize};
            border-style: solid;
            border-color: ${arrowColor} transparent transparent transparent;
          }
        `
      case 'left center':
        return css`
          &::before {
            content: '';
            position: absolute;
            right: -${arrowSize};
            top: 50%;
            transform: translateY(-50%);
            border-width: ${arrowSize} 0 ${arrowSize} ${arrowSize};
            border-style: solid;
            border-color: transparent transparent transparent ${arrowColor};
          }
        `
      case 'right center':
        return css`
          &::before {
            content: '';
            position: absolute;
            left: -${arrowSize};
            top: 50%;
            transform: translateY(-50%);
            border-width: ${arrowSize} ${arrowSize} ${arrowSize} 0;
            border-style: solid;
            border-color: transparent ${arrowColor} transparent transparent;
          }
        `
      default:
        return ''
    }
  }}
`

const TriggerWrapper = styled.span`
  display: inline-block;
  cursor: pointer;
`

// Helper function to calculate position - extracted to avoid dependency issues
function calculatePosition(
  triggerRect: DOMRect,
  popupRect: DOMRect | null,
  position: PopupPosition,
  offset: [number, number]
): PopupContentPosition {
  const popupWidth = popupRect?.width || 200
  const popupHeight = popupRect?.height || 100
  const gap = 8 // Gap between trigger and popup

  let top = 0
  let left = 0

  switch (position) {
    case 'bottom left':
      top = triggerRect.bottom + gap
      left = triggerRect.left
      break
    case 'bottom center':
      top = triggerRect.bottom + gap
      left = triggerRect.left + triggerRect.width / 2 - popupWidth / 2
      break
    case 'bottom right':
      top = triggerRect.bottom + gap
      left = triggerRect.right - popupWidth
      break
    case 'top left':
      top = triggerRect.top - popupHeight - gap
      left = triggerRect.left
      break
    case 'top center':
      top = triggerRect.top - popupHeight - gap
      left = triggerRect.left + triggerRect.width / 2 - popupWidth / 2
      break
    case 'top right':
      top = triggerRect.top - popupHeight - gap
      left = triggerRect.right - popupWidth
      break
    case 'left center':
      top = triggerRect.top + triggerRect.height / 2 - popupHeight / 2
      left = triggerRect.left - popupWidth - gap
      break
    case 'right center':
      top = triggerRect.top + triggerRect.height / 2 - popupHeight / 2
      left = triggerRect.right + gap
      break
  }

  // Apply offset
  left += offset[0]
  top += offset[1]

  // Ensure popup stays within viewport
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  if (left < 8) left = 8
  if (left + popupWidth > viewportWidth - 8) {
    left = viewportWidth - popupWidth - 8
  }
  if (top < 8) top = 8
  if (top + popupHeight > viewportHeight - 8) {
    top = viewportHeight - popupHeight - 8
  }

  return { top, left }
}

export function Popup({
  trigger,
  children,
  content,
  on: _on = 'click', // Reserved for future hover support
  open: controlledOpen,
  onClose,
  position = 'bottom left',
  className,
  wide = false,
  basic = false,
  offset = [0, 0],
  style
}: PopupProps): JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false)
  const [popupPosition, setPopupPosition] = useState<PopupContentPosition>({
    top: 0,
    left: 0
  })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Store position and offset in refs to avoid dependency issues
  const positionRef = useRef(position)
  const offsetRef = useRef(offset)
  positionRef.current = position
  offsetRef.current = offset

  // Use controlled or uncontrolled mode
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const closePopup = useCallback(() => {
    if (isControlled) {
      onClose?.()
    } else {
      setInternalOpen(false)
    }
  }, [isControlled, onClose])

  const togglePopup = useCallback(() => {
    if (isControlled) {
      if (isOpen) {
        onClose?.()
      }
      // In controlled mode, opening should be handled by the parent
    } else {
      setInternalOpen(prev => !prev)
    }
  }, [isControlled, isOpen, onClose])

  // Calculate and update popup position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const popupRect = popupRef.current?.getBoundingClientRect() || null

    const newPosition = calculatePosition(
      triggerRect,
      popupRect,
      positionRef.current,
      offsetRef.current
    )

    setPopupPosition(prev => {
      // Only update if position actually changed to avoid unnecessary renders
      if (prev.top === newPosition.top && prev.left === newPosition.left) {
        return prev
      }
      return newPosition
    })
  }, []) // No dependencies - uses refs

  // Update position when popup opens
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen, updatePosition])

  // Update position after popup content renders to get accurate dimensions
  useLayoutEffect(() => {
    if (!isOpen || !popupRef.current) {
      return
    }
    // Use requestAnimationFrame to ensure content is rendered
    const rafId = requestAnimationFrame(() => {
      updatePosition()
    })
    return () => cancelAnimationFrame(rafId)
  }, [isOpen, updatePosition, children, content])

  // Handle resize and scroll
  useEffect(() => {
    if (!isOpen) return

    const handleResize = () => updatePosition()
    const handleScroll = () => updatePosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, updatePosition])

  // Handle click outside
  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      // Only close if clicking the overlay itself, not the popup content
      if (event.target === event.currentTarget) {
        closePopup()
      }
    },
    [closePopup]
  )

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePopup()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closePopup])

  const handleTriggerClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation()
      togglePopup()

      // Call original onClick if present
      const originalOnClick = trigger.props.onClick
      if (originalOnClick) {
        originalOnClick(event)
      }
    },
    [togglePopup, trigger.props.onClick]
  )

  const popupContent = children || content

  return (
    <>
      <TriggerWrapper ref={triggerRef} onClick={handleTriggerClick}>
        {trigger}
      </TriggerWrapper>
      {isOpen &&
        createPortal(
          <PopupOverlay onClick={handleOverlayClick}>
            <PopupContent
              ref={popupRef}
              className={className}
              $wide={wide}
              $basic={basic}
              $position={position}
              style={{
                ...style,
                top: popupPosition.top,
                left: popupPosition.left
              }}
              onClick={e => e.stopPropagation()}
            >
              {popupContent}
            </PopupContent>
          </PopupOverlay>,
          document.body
        )}
    </>
  )
}

export default Popup
