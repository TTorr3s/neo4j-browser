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
  useState,
  useEffect,
  memo,
  CSSProperties,
  ReactNode
} from 'react'

interface DisplayProps {
  if: boolean
  lazy?: boolean
  inline?: boolean
  style?: CSSProperties
  children?: ReactNode
}

const Display = memo(function Display({
  if: shouldShow,
  lazy,
  inline,
  style = {},
  children
}: DisplayProps): JSX.Element | null {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (shouldShow && !mounted) {
      setMounted(true)
    }
  }, [shouldShow, mounted])

  // If lazy, don't load anything until it's time
  if (!shouldShow && !mounted && lazy) {
    return null
  }

  const modStyle: CSSProperties = {
    ...style,
    width: 'inherit',
    display: !shouldShow ? 'none' : inline ? 'inline' : 'block'
  }

  return <div style={modStyle}>{children}</div>
})

export default Display
