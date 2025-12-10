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
  useCallback,
  useRef,
  TransitionEvent
} from 'react'

import {
  StyledBottomNav,
  StyledDrawer,
  StyledSidebar,
  StyledTabsWrapper,
  StyledTopNav
} from './styled'
import {
  NavigationButtonContainer,
  StyledNavigationButton
} from 'browser-components/buttons'
import { Resizable } from 're-resizable'

export const LARGE_DRAWER_WIDTH = 500
export const STANDARD_DRAWER_WIDTH = 300

const Closing = 'CLOSING'
const Closed = 'CLOSED'
const Open = 'OPEN'
const Opening = 'OPENING'
type DrawerTransitionState =
  | typeof Closing
  | typeof Closed
  | typeof Open
  | typeof Opening

export interface NavItem {
  name: string
  title: string
  icon: (isOpen: boolean) => JSX.Element
  content: any
}

interface NavigationProps {
  selectedDrawerName: string | null
  onNavClick: (name: string) => void
  topNavItems: NavItem[]
  bottomNavItems?: NavItem[]
}

const Navigation: React.FC<NavigationProps> = ({
  selectedDrawerName,
  onNavClick,
  topNavItems,
  bottomNavItems = []
}) => {
  const [transitionState, setTransitionState] = useState<DrawerTransitionState>(
    selectedDrawerName ? Open : Closed
  )
  const [closingDrawerName, setClosingDrawerName] = useState<string | null>(
    null
  )
  const [isResizing, setIsResizing] = useState(false)

  // Use ref to track previous selectedDrawerName for transition logic
  const prevSelectedDrawerNameRef = useRef<string | null>(selectedDrawerName)

  useEffect(() => {
    const prevSelectedDrawerName = prevSelectedDrawerNameRef.current

    if (prevSelectedDrawerName !== selectedDrawerName) {
      if (selectedDrawerName) {
        // Opening drawer
        if (transitionState === Closed || transitionState === Closing) {
          setTransitionState(Opening)
          setClosingDrawerName(null)
        }
      } else {
        // Closing drawer
        if (transitionState === Open || transitionState === Opening) {
          setTransitionState(Closing)
          setClosingDrawerName(prevSelectedDrawerName)
        }
      }
    }

    prevSelectedDrawerNameRef.current = selectedDrawerName
  }, [selectedDrawerName, transitionState])

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>): void => {
      if (event.propertyName !== 'width') {
        return
      }

      if (transitionState === Closing) {
        setTransitionState(Closed)
      }
      if (transitionState === Opening) {
        setTransitionState(Open)
      }
    },
    [transitionState]
  )

  const handleResizeStart = useCallback(() => {
    setIsResizing(true)
  }, [])

  const handleResizeStop = useCallback(() => {
    setIsResizing(false)
  }, [])

  const buildNavList = (
    list: NavItem[],
    currentSelectedDrawerName?: null | string
  ) =>
    list.map(item => {
      const isOpen = item.name.toLowerCase() === currentSelectedDrawerName
      return (
        <NavigationButtonContainer
          key={item.name}
          title={item.title}
          data-testid={`navigation${item.name}`}
          onClick={() => onNavClick(item.name.toLowerCase())}
          isOpen={isOpen}
        >
          <StyledNavigationButton name={item.name}>
            {item.icon(isOpen)}
          </StyledNavigationButton>
        </NavigationButtonContainer>
      )
    })

  const getContentToShow = (drawerName?: null | string) => {
    if (drawerName) {
      const filteredList = topNavItems
        .concat(bottomNavItems)
        .filter(item => item.name.toLowerCase() === drawerName)
      const TabContent = filteredList[0].content
      return <TabContent />
    }
    return null
  }

  const topNavItemsList = buildNavList(topNavItems, selectedDrawerName)
  const bottomNavItemsList = buildNavList(bottomNavItems, selectedDrawerName)

  const drawerIsVisible = transitionState !== Closed

  const drawerWidth = STANDARD_DRAWER_WIDTH
  const isOpenOrOpening =
    transitionState === Open || transitionState === Opening
  const width = isOpenOrOpening ? drawerWidth : 0

  return (
    <StyledSidebar>
      <StyledTabsWrapper>
        <StyledTopNav>{topNavItemsList}</StyledTopNav>
        <StyledBottomNav>{bottomNavItemsList}</StyledBottomNav>
      </StyledTabsWrapper>

      <StyledDrawer
        onTransitionEnd={onTransitionEnd}
        style={{
          width: isResizing ? 'unset' : width
        }}
      >
        <Resizable
          minWidth={0}
          maxWidth={'70vw'}
          size={{ width: width, height: '100%' }}
          onResizeStart={handleResizeStart}
          onResizeStop={handleResizeStop}
          enable={{
            top: false,
            right: false,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false
          }}
          style={{ zIndex: 100 }}
        >
          {drawerIsVisible &&
            getContentToShow(selectedDrawerName || closingDrawerName)}
        </Resizable>
      </StyledDrawer>
    </StyledSidebar>
  )
}

export default Navigation
