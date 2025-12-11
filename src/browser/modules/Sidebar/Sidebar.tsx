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
import React from 'react'
import { connect } from 'react-redux'

import {
  AboutIcon,
  DatabaseIcon,
  DocumentsIcon,
  FavoritesIcon,
  NotesIcon,
  SettingsIcon
} from 'browser-components/icons/LegacyIcons'

import DatabaseDrawer from '../DBMSInfo/DBMSInfo'
import AboutDrawer from './About'
import DocumentsDrawer from './Documents'
import NotesDrawer from './Notes/Notes'
import UserSettingsDrawer from './UserSettings'
import Favorites from './favorites'
import StaticScripts from './static-scripts'
import TabNavigation, {
  NavItem,
  STANDARD_DRAWER_WIDTH
} from 'browser-components/TabNavigation/Navigation'
import { DrawerHeader } from 'browser-components/drawer/drawer-styled'
import { GlobalState } from 'shared/globalState'
import {
  CONNECTED_STATE,
  DISCONNECTED_STATE,
  PENDING_STATE
} from 'shared/modules/connections/connectionsDuck'

interface SidebarProps {
  selectedDrawerName: string
  onNavClick: () => void
  neo4jConnectionState: string
  showStaticScripts: boolean
}

const Sidebar = ({
  selectedDrawerName,
  onNavClick,
  neo4jConnectionState,
  showStaticScripts
}: SidebarProps) => {
  const topNavItems: NavItem[] = [
    {
      name: 'DBMS',
      title: 'Database Information',
      icon: function dbIcon(isOpen: boolean): JSX.Element {
        return (
          <DatabaseIcon
            isOpen={isOpen}
            connectionState={neo4jConnectionState}
            title="Database"
          />
        )
      },
      content: DatabaseDrawer
    },
    {
      name: 'Favorites',
      title: 'Favorites',
      icon: function favIcon(isOpen: boolean): JSX.Element {
        return <FavoritesIcon isOpen={isOpen} title="Favorites" />
      },
      content: function FavoritesDrawer(): JSX.Element {
        return (
          <div style={{ width: STANDARD_DRAWER_WIDTH }}>
            <DrawerHeader> Favorites </DrawerHeader>
            <Favorites />
            {showStaticScripts && <StaticScripts />}
          </div>
        )
      }
    },
    {
      name: 'Notes',
      title: 'Notes',
      icon: function notesIcon(isOpen: boolean): JSX.Element {
        return <NotesIcon isOpen={isOpen} title="Notes" />
      },
      content: NotesDrawer
    }
  ]

  const bottomNavItems: NavItem[] = [
    {
      name: 'Documents',
      title: 'Help &amp; Resources',
      icon: function docsIcon(isOpen: boolean): JSX.Element {
        return <DocumentsIcon isOpen={isOpen} title="Help &amp; Resources" />
      },
      content: DocumentsDrawer
    },
    {
      name: 'Settings',
      title: 'Settings',
      icon: function settingIcon(isOpen: boolean): JSX.Element {
        return <SettingsIcon isOpen={isOpen} title="Browser Settings" />
      },
      content: UserSettingsDrawer
    },
    {
      name: 'About',
      title: 'About Neo4j',
      icon: function aboutIcon(isOpen: boolean): JSX.Element {
        return <AboutIcon isOpen={isOpen} title="About Neo4j" />
      },
      content: AboutDrawer
    }
  ]

  return (
    <TabNavigation
      selectedDrawerName={selectedDrawerName}
      onNavClick={onNavClick}
      topNavItems={topNavItems}
      bottomNavItems={bottomNavItems}
    />
  )
}

const mapStateToProps = (state: GlobalState) => {
  let connectionState = 'disconnected'
  if (state.connections) {
    switch (state.connections.connectionState) {
      case PENDING_STATE:
        connectionState = 'pending'
        break
      case CONNECTED_STATE:
        connectionState = 'connected'
        break
      case DISCONNECTED_STATE:
        connectionState = 'disconnected'
        break
    }
  }
  return {
    neo4jConnectionState: connectionState,
    showStaticScripts: state.settings.showSampleScripts
  }
}

export default connect(mapStateToProps)(Sidebar)
