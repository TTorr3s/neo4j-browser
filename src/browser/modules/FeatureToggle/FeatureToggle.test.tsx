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
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'

import FeatureToggle from './FeatureToggle'
import { FeatureToggleProvider } from './FeatureToggleProvider'
import { NAME as EXPERIMENTAL_FEATURES_NAME } from 'shared/modules/experimentalFeatures/experimentalFeaturesDuck'

const createMockStore = (features: Record<string, { on: boolean }>) => {
  return createStore(() => ({
    [EXPERIMENTAL_FEATURES_NAME]: features
  }))
}

const On = () => {
  return <h1>Yes</h1>
}
const Off = () => {
  return <h1>No</h1>
}

type ErrorBState = any

class ErrorB extends React.Component<{}, ErrorBState> {
  state = {
    error: ''
  }

  componentDidCatch(e: any) {
    this.setState({ error: e })
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }
    return <span data-testid="error">{this.state.error.toString()}</span>
  }
}

describe('FeatureToggle', () => {
  test('shows features when theres no context provider available', () => {
    render(<FeatureToggle name="testFeature" on={<On />} off={<Off />} />)

    // Then
    expect(screen.getByText('Yes')).not.toBeUndefined()
    expect(screen.queryByText('No')).toBeNull()
  })
  test('shows "on" features when context says so', () => {
    // Given
    const features = { testFeature: { on: true } }
    const store = createMockStore(features)

    render(
      <Provider store={store}>
        <FeatureToggleProvider>
          <FeatureToggle name="testFeature" on={<On />} off={<Off />} />
        </FeatureToggleProvider>
      </Provider>
    )

    // Then
    expect(screen.getByText('Yes')).not.toBeUndefined()
    expect(screen.queryByText('No')).toBeNull()
  })
  test('shows "off" features when context says so', () => {
    // Given
    const features = { testFeature: { on: false } }
    const store = createMockStore(features)

    render(
      <Provider store={store}>
        <FeatureToggleProvider>
          <FeatureToggle name="testFeature" on={<On />} off={<Off />} />
        </FeatureToggleProvider>
      </Provider>
    )

    // Then
    expect(screen.getByText('No')).not.toBeUndefined()
    expect(screen.queryByText('Yes')).toBeNull()
  })
  test('returns null if no "off" prop is availavle', () => {
    // Given
    const features = { testFeature: { on: false } }
    const store = createMockStore(features)

    render(
      <Provider store={store}>
        <FeatureToggleProvider>
          <FeatureToggle name="testFeature" on={<On />} />
        </FeatureToggleProvider>
      </Provider>
    )
    // Then

    expect(screen.queryByText('Yes')).toBeNull()
    expect(screen.queryByText('No')).toBeNull()
  })
  test('throws if no "on" prop is available but the feature is to be shown', async () => {
    // Given
    const oldConsoleError = console.error
    console.error = () => {}

    const features = { testFeature: { on: true } }
    const store = createMockStore(features)

    // When
    render(
      <ErrorB>
        <Provider store={store}>
          <FeatureToggleProvider>
            <FeatureToggle name="testFeature" off={<Off />} />
          </FeatureToggleProvider>
        </Provider>
      </ErrorB>
    )

    // Wait for error propagation
    await waitFor(() => screen.getByTestId('error'))

    // Then
    expect(screen.getByTestId('error')).toHaveTextContent(
      'No "on" property available for this enabled feature: testFeature for FeatureToggle component.'
    )

    console.error = oldConsoleError
  })
  test('throws if no "name" property provided', async () => {
    // Given
    const oldConsoleError = console.error
    console.error = () => {}

    const features = { testFeature: { on: true } }
    const store = createMockStore(features)

    // When
    render(
      <ErrorB>
        <Provider store={store}>
          <FeatureToggleProvider>
            <FeatureToggle on={<On />} off={<Off />} />
          </FeatureToggleProvider>
        </Provider>
      </ErrorB>
    )

    // Wait for error propagation
    await waitFor(() => screen.getByTestId('error'))

    // Then
    expect(screen.getByTestId('error')).toHaveTextContent(
      'No "name" property provided to FeatureToggle component.'
    )

    console.error = oldConsoleError
  })
})
