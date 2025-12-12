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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { ThemeProvider } from 'styled-components'

import { Popup } from './Popup'
import { base as theme } from 'browser-styles/themes'

const renderWithTheme = (component: React.ReactElement<any>) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
}

describe('Popup', () => {
  it('renders trigger element', () => {
    renderWithTheme(
      <Popup trigger={<button>Click me</button>}>Popup content</Popup>
    )

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('shows content when trigger is clicked', async () => {
    renderWithTheme(
      <Popup trigger={<button>Click me</button>}>Popup content</Popup>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }))

    await waitFor(() => {
      expect(screen.getByText('Popup content')).toBeInTheDocument()
    })
  })

  it('closes popup when clicking trigger again (toggle)', async () => {
    renderWithTheme(
      <Popup trigger={<button>Click me</button>}>Popup content</Popup>
    )

    const trigger = screen.getByRole('button', { name: 'Click me' })

    // Open the popup
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(screen.getByText('Popup content')).toBeInTheDocument()
    })

    // Click trigger again to close
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(screen.queryByText('Popup content')).not.toBeInTheDocument()
    })
  })

  it('works in controlled mode', async () => {
    const onClose = jest.fn()

    const { rerender } = renderWithTheme(
      <Popup trigger={<button>Click me</button>} open={true} onClose={onClose}>
        Popup content
      </Popup>
    )

    await waitFor(() => {
      expect(screen.getByText('Popup content')).toBeInTheDocument()
    })

    // Clicking trigger in controlled mode should call onClose
    fireEvent.click(screen.getByRole('button', { name: 'Click me' }))
    expect(onClose).toHaveBeenCalled()

    // Rerender with open=false to hide
    rerender(
      <ThemeProvider theme={theme}>
        <Popup
          trigger={<button>Click me</button>}
          open={false}
          onClose={onClose}
        >
          Popup content
        </Popup>
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Popup content')).not.toBeInTheDocument()
    })
  })

  it('closes on Escape key press', async () => {
    renderWithTheme(
      <Popup trigger={<button>Click me</button>}>Popup content</Popup>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }))

    await waitFor(() => {
      expect(screen.getByText('Popup content')).toBeInTheDocument()
    })

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText('Popup content')).not.toBeInTheDocument()
    })
  })

  it('renders with content prop instead of children', async () => {
    renderWithTheme(
      <Popup trigger={<button>Click me</button>} content="Popup content" />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Click me' }))

    await waitFor(() => {
      expect(screen.getByText('Popup content')).toBeInTheDocument()
    })
  })

  it('applies className to popup content', async () => {
    renderWithTheme(
      <Popup
        trigger={<button>Click me</button>}
        className="custom-class"
        open={true}
      >
        <div data-testid="popup-inner">Popup content</div>
      </Popup>
    )

    await waitFor(() => {
      const innerContent = screen.getByTestId('popup-inner')
      // The className is applied to the PopupContent wrapper which is the parent
      const popupContentWrapper = innerContent.parentElement
      expect(popupContentWrapper).toHaveClass('custom-class')
    })
  })
})
