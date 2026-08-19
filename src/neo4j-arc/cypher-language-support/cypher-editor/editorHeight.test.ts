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
import {
  DEFAULT_MAX_HEIGHT_PX,
  DEFAULT_MAX_HEIGHT_VIEWPORT_RATIO,
  DEFAULT_MIN_HEIGHT,
  EditorHeightInput,
  autoMaxHeight,
  computeEditorHeight
} from './CypherEditor'

const TALL_VIEWPORT = 1400 // 40% == 560, above the 400px floor
const SHORT_VIEWPORT = 700 // 40% == 280, below the 400px floor

function input(overrides: Partial<EditorHeightInput> = {}): EditorHeightInput {
  return {
    contentHeight: 23,
    mode: 'auto',
    fixedHeight: null,
    minHeight: DEFAULT_MIN_HEIGHT,
    maxHeightPx: DEFAULT_MAX_HEIGHT_PX,
    maxHeightViewportRatio: DEFAULT_MAX_HEIGHT_VIEWPORT_RATIO,
    viewportHeight: TALL_VIEWPORT,
    ...overrides
  }
}

describe('autoMaxHeight', () => {
  test('the px floor wins on a short viewport', () => {
    expect(autoMaxHeight(400, 0.4, SHORT_VIEWPORT)).toBe(400)
  })

  test('the viewport share wins on a tall viewport', () => {
    expect(autoMaxHeight(400, 0.4, TALL_VIEWPORT)).toBe(560)
  })
})

describe('computeEditorHeight — auto mode', () => {
  test('an empty editor still gets the minimum height', () => {
    expect(computeEditorHeight(input({ contentHeight: 0 }))).toBe(
      DEFAULT_MIN_HEIGHT
    )
  })

  test('a one-line query gets the minimum height', () => {
    expect(computeEditorHeight(input({ contentHeight: 23 }))).toBe(
      DEFAULT_MIN_HEIGHT
    )
  })

  test('grows with the content once past the minimum', () => {
    expect(computeEditorHeight(input({ contentHeight: 200 }))).toBe(200)
  })

  test('stops at the ceiling on a tall viewport', () => {
    expect(computeEditorHeight(input({ contentHeight: 5000 }))).toBe(560)
  })

  test('stops at the px floor ceiling on a short viewport', () => {
    expect(
      computeEditorHeight(
        input({ contentHeight: 5000, viewportHeight: SHORT_VIEWPORT })
      )
    ).toBe(400)
  })

  test('shrinks back down when the content shrinks', () => {
    expect(computeEditorHeight(input({ contentHeight: 300 }))).toBe(300)
    expect(computeEditorHeight(input({ contentHeight: 120 }))).toBe(120)
  })
})

describe('computeEditorHeight — fixed mode', () => {
  test('uses the hand-set height verbatim', () => {
    expect(
      computeEditorHeight(
        input({ mode: 'fixed', fixedHeight: 250, contentHeight: 23 })
      )
    ).toBe(250)
  })

  test('content changes do not move a hand-set height', () => {
    const fixed = input({ mode: 'fixed', fixedHeight: 250 })
    expect(computeEditorHeight({ ...fixed, contentHeight: 23 })).toBe(250)
    expect(computeEditorHeight({ ...fixed, contentHeight: 900 })).toBe(250)
  })

  test('allows dragging past the auto ceiling', () => {
    expect(
      computeEditorHeight(input({ mode: 'fixed', fixedHeight: 900 }))
    ).toBe(900)
  })

  test('still enforces the floor', () => {
    expect(computeEditorHeight(input({ mode: 'fixed', fixedHeight: 10 }))).toBe(
      DEFAULT_MIN_HEIGHT
    )
  })

  test('falls back to auto when no height was set', () => {
    expect(
      computeEditorHeight(
        input({ mode: 'fixed', fixedHeight: null, contentHeight: 200 })
      )
    ).toBe(200)
  })
})

describe('computeEditorHeight — fullscreen mode', () => {
  test('fills the viewport regardless of content', () => {
    expect(
      computeEditorHeight(input({ mode: 'fullscreen', contentHeight: 23 }))
    ).toBe(TALL_VIEWPORT - 20)
  })

  test('wins over a hand-set height', () => {
    expect(
      computeEditorHeight(
        input({ mode: 'fullscreen', fixedHeight: 120, contentHeight: 23 })
      )
    ).toBe(TALL_VIEWPORT - 20)
  })
})
