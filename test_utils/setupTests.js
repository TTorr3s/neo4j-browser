/*
 * Copyright (c) 2002-2021 "Neo4j,"
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
import '@testing-library/jest-dom'
// Workaround to get whatwg-url to not fail in tests.
// https://github.com/jsdom/whatwg-url/issues/209
import { TextDecoder, TextEncoder } from 'util'

// Native fetch mock implementation
const createFetchMock = () => {
  let mockResponses = []

  const mockFetch = jest.fn((url, options) => {
    if (mockResponses.length === 0) {
      return Promise.reject(new Error('No mock response configured'))
    }

    const response = mockResponses.shift()
    const { body, init = {} } = response

    return Promise.resolve({
      ok: (init.status || 200) >= 200 && (init.status || 200) < 300,
      status: init.status || 200,
      statusText: init.statusText || 'OK',
      headers: new Headers(init.headers || {}),
      json: () =>
        Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
      text: () =>
        Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
      clone: function () {
        return this
      }
    })
  })

  mockFetch.mockResponseOnce = (body, init = {}) => {
    mockResponses.push({ body, init })
    return mockFetch
  }

  mockFetch.mockResponses = (...responses) => {
    responses.forEach(([body, init = {}]) => {
      mockResponses.push({ body, init })
    })
    return mockFetch
  }

  mockFetch.resetMocks = () => {
    mockResponses = []
    mockFetch.mockClear()
  }

  return mockFetch
}

// Create and expose global fetch mock
global.fetchMock = createFetchMock()
global.fetch = global.fetchMock

// Add extra expect functions to be used in tests

// polyfill for jsdom (for tests only)
// tests with cypher editor support break without it
global.document.createRange = () => {
  return {
    setEnd: () => {},
    setStart: () => {},
    getBoundingClientRect: () => {},
    getClientRects: () => []
  }
}
// needed for testing monaco
document.queryCommandSupported = () => false
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})
window.ResizeObserver = class {
  observe() {}
}
window.SVGElement.prototype.getBBox = () => ({
  x: 0,
  y: 0
})

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill for setImmediate (not available in jsdom/browser environment)
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => {
    return setTimeout(callback, 0, ...args)
  }
  global.clearImmediate = id => {
    return clearTimeout(id)
  }
}

// Mock bolt module to avoid import.meta.url issues
jest.mock('services/bolt/bolt')
