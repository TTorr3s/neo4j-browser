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
import React, { CSSProperties, ReactNode, useMemo } from 'react'
import styled, { FlattenSimpleInterpolation } from 'styled-components'

const StyledI = styled.i<{
  isOpen?: boolean
  activeStyle?: string | FlattenSimpleInterpolation
  inactiveStyle?: string
}>`
  ${props => (props.isOpen ? props.activeStyle : props.inactiveStyle)};
  &:hover {
    ${props => props.activeStyle};
  }
`

const StyledIconWrapper = ({
  activeStyle,
  inactiveStyle,
  isOpen,
  children,
  ...rest
}: Exclude<
  IconContainerProps,
  'text' | 'fontSize' | 'icon' | 'width' | 'title'
>) => {
  return (
    <StyledI
      isOpen={isOpen}
      activeStyle={activeStyle}
      inactiveStyle={inactiveStyle}
      {...rest}
    >
      {children}
    </StyledI>
  )
}

const StyledText = styled.div`
  font-size: 9px;
  line-height: 10px;
  margin-top: 4px;
  padding: 0;
`

/**
 * Processes an SVG string to:
 * 1. Remove <title> elements for accessibility cleanup
 * 2. Add className to the SVG element
 * 3. Add width attribute if specified
 * 4. Add aria-label for accessibility if title is provided
 */
function processSvg(
  svg: string,
  options: { className?: string; width?: number; accessibilityLabel?: string }
): string {
  let processed = svg

  // Remove <title> elements (equivalent to cleanup={['title']} in react-svg-inline)
  processed = processed.replace(/<title[^>]*>.*?<\/title>/gi, '')

  // Add attributes to the <svg> tag
  const attributes: string[] = []

  if (options.className) {
    // Check if class already exists, if so append, otherwise add
    if (processed.includes('class="')) {
      processed = processed.replace(
        /class="([^"]*)"/,
        `class="$1 ${options.className}"`
      )
    } else {
      attributes.push(`class="${options.className}"`)
    }
  }

  if (options.width) {
    // Remove existing width/height and add new width (maintaining aspect ratio)
    processed = processed.replace(/\s(width|height)="[^"]*"/g, '')
    attributes.push(`width="${options.width}px"`)
  }

  if (options.accessibilityLabel) {
    attributes.push(`aria-label="${options.accessibilityLabel}"`)
    attributes.push('role="img"')
  }

  // Insert attributes into the <svg> tag
  if (attributes.length > 0) {
    processed = processed.replace('<svg', `<svg ${attributes.join(' ')}`)
  }

  return processed
}

type IconContainerProps = {
  activeStyle?: string | FlattenSimpleInterpolation
  icon?: string
  inactiveStyle?: string
  isOpen?: boolean
  text?: string
  title?: string
  width?: number
  /** controlling size of icons that are fonts */
  fontSize?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export const IconContainer = (props: IconContainerProps): JSX.Element => {
  const { text, icon, width, title, fontSize, ...rest } = props

  const processedSvg = useMemo(() => {
    if (!icon) return null
    return processSvg(icon, {
      className: 'centeredSvgIcon',
      width,
      accessibilityLabel: title
    })
  }, [icon, width, title])

  const currentIcon =
    icon && processedSvg ? (
      <StyledIconWrapper {...rest}>
        <span
          dangerouslySetInnerHTML={{ __html: processedSvg }}
          style={{ display: 'inline-flex', alignItems: 'center' }}
        />
      </StyledIconWrapper>
    ) : (
      <StyledIconWrapper
        {...rest}
        title={title}
        style={{ fontSize: fontSize, lineHeight: 'inherit' }}
      />
    )

  return text ? (
    <span>
      {currentIcon}
      <StyledText>{text}</StyledText>
    </span>
  ) : (
    currentIcon
  )
}
