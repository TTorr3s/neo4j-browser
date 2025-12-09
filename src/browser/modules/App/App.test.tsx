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

/* eslint-disable react/display-name */
import { render } from '@testing-library/react'
import React from 'react'
import configureMockStore from 'redux-mock-store'

import { App } from './App'

const mockStore = configureMockStore()
const store = mockStore({})

// Mock components with complex dependencies
jest.mock(
  '../Main/Main',
  () =>
    function MockMain() {
      return <div data-testid="main">Main</div>
    }
)
jest.mock(
  '../Sidebar/Sidebar',
  () =>
    function MockSidebar() {
      return <div data-testid="sidebar">Sidebar</div>
    }
)
jest.mock(
  '../Segment',
  () =>
    function MockSegment() {
      return <div />
    }
)
jest.mock(
  '../UserInteraction',
  () =>
    function MockUserInteraction() {
      return <div />
    }
)
jest.mock(
  'browser-components/FileDrop/FileDrop',
  () =>
    function MockFileDrop({ children }: any) {
      return <div>{children}</div>
    }
)
jest.mock(
  'browser-components/desktop-api/desktop-api',
  () =>
    function MockDesktopApi() {
      return <div />
    }
)
jest.mock(
  'browser-components/ErrorBoundary',
  () =>
    function MockErrorBoundary({ children }: any) {
      return <div>{children}</div>
    }
)
jest.mock('../FeatureToggle/FeatureToggleProvider', () => {
  return ({ children }: any) => <div>{children}</div>
})
jest.mock('./PerformanceOverlay.tsx', () => () => <div />)

// Mock hooks
jest.mock('./keyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn()
}))
jest.mock('browser-hooks/useDerivedTheme', () => ({
  __esModule: true,
  default: () => ['light', jest.fn()]
}))

// Mock neo4j-arc
jest.mock('neo4j-arc/cypher-language-support', () => ({
  setEditorTheme: jest.fn()
}))

const mockBus = {
  take: jest.fn(),
  send: jest.fn()
}

const noOp = () => undefined

const baseProps = {
  store,
  bus: mockBus,
  theme: 'light',
  experimentalFeatures: {},
  drawer: null,
  connectionState: 0,
  codeFontLigatures: true,
  lastConnectionUpdate: 0,
  errorMessage: null,
  loadExternalScripts: false,
  titleString: 'Neo4j Browser',
  defaultConnectionData: null,
  isWebEnv: true,
  useDb: 'neo4j',
  isDatabaseUnavailable: false,
  telemetrySettings: {
    allowUserStats: false,
    source: 'BROWSER_SETTING'
  },
  consentBannerShownCount: 0,
  edition: 'enterprise',
  connectedTo: 'NOT CONNECTED',
  trialStatus: { status: 'unknown' },
  handleNavClick: noOp,
  setConsentBannerShownCount: noOp,
  updateDesktopUDCSettings: noOp,
  openSettingsDrawer: noOp
}

describe('App', () => {
  test('App loads and renders main components', async () => {
    // When
    const { getByTestId } = render(<App {...baseProps} />)

    // Then
    expect(getByTestId('main')).toBeInTheDocument()
    expect(getByTestId('sidebar')).toBeInTheDocument()
  })

  test('App applies font ligatures class when disabled', () => {
    // Given
    const props = {
      ...baseProps,
      codeFontLigatures: false
    }

    // When
    const { container } = render(<App {...props} />)

    // Then
    const wrapper = container.querySelector('.disable-font-ligatures')
    expect(wrapper).toBeInTheDocument()
  })

  test('App does not apply font ligatures class when enabled', () => {
    // Given
    const props = {
      ...baseProps,
      codeFontLigatures: true
    }

    // When
    const { container } = render(<App {...props} />)

    // Then
    const wrapper = container.querySelector('.disable-font-ligatures')
    expect(wrapper).not.toBeInTheDocument()
  })
})
