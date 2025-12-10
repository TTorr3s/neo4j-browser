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
/* eslint-disable react/prop-types */
import React, { useState, useCallback, ReactNode } from 'react'

import { BorderedWrapper, ContentArea, TitleBar } from './styled'

interface TitleProps {
  onClick: () => void
  active: boolean
}

interface ContentProps {
  active: boolean
}

interface ChildProps {
  titleProps: TitleProps
  contentProps: ContentProps
}

interface GetChildPropsParams {
  index: number
  defaultActive?: boolean
  forceActive?: boolean
}

interface AccordionRenderProps {
  getChildProps: (params: GetChildPropsParams) => ChildProps
}

interface AccordionProps {
  render: (props: AccordionRenderProps) => ReactNode
  [key: string]: unknown
}

interface AccordionComponent {
  (props: AccordionProps): JSX.Element
  Title: typeof Title
  Content: typeof Content
}

const Accordion: AccordionComponent = ({ render: renderProp, ...rest }) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [initialLoad, setInitialLoad] = useState<boolean>(true)

  const titleClick = useCallback(
    (index: number) => {
      const newIndex = activeIndex === index ? -1 : index
      setActiveIndex(newIndex)
      setInitialLoad(false)
    },
    [activeIndex]
  )

  const getChildProps = useCallback(
    ({
      index,
      defaultActive = false,
      forceActive = false
    }: GetChildPropsParams): ChildProps => {
      const props: ChildProps = {
        titleProps: {
          onClick: () => titleClick(index),
          active: false
        },
        contentProps: {
          active: false
        }
      }

      if (forceActive) {
        props.titleProps.onClick = () => {}
      }

      if (defaultActive && initialLoad) {
        props.titleProps.onClick = () => titleClick(-1)
      }

      if (
        index === activeIndex ||
        (initialLoad && defaultActive) ||
        forceActive
      ) {
        props.titleProps.active = true
        props.contentProps.active = true
        return props
      }

      props.titleProps.active = false
      props.contentProps.active = false
      return props
    },
    [activeIndex, initialLoad, titleClick]
  )

  return (
    <BorderedWrapper {...rest}>{renderProp({ getChildProps })}</BorderedWrapper>
  )
}

const Title = ({
  children,
  ...rest
}: {
  children?: ReactNode
  [key: string]: unknown
}) => {
  return <TitleBar {...rest}>{children}</TitleBar>
}
Accordion.Title = Title

const Content = ({
  children,
  active,
  ...rest
}: {
  children?: ReactNode
  active?: boolean
  [key: string]: unknown
}) => {
  if (!active) return null
  return <ContentArea {...rest}>{children}</ContentArea>
}
Accordion.Content = Content

export default Accordion
