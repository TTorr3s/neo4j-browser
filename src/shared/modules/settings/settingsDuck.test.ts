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
import reducer, {
  AUTO_THEME,
  BEARDED_MELLE_JULIET_LIGHT_THEME,
  BEARDED_OLED_THEME,
  BEARDED_VIVID_BLACK_THEME,
  DARK_THEME,
  DISABLE_IMPLICIT_INIT_COMMANDS,
  LIGHT_THEME,
  NAME,
  NORD_THEME,
  REPLACE,
  SOLARIZED_LIGHT_THEME,
  UPDATE,
  getInitCmd,
  getTheme,
  resolveTheme
} from './settingsDuck'
import { dehydrate } from 'services/duckUtils'
import { APP_START } from 'shared/modules/app/appDuck'

describe('settings reducer', () => {
  test('handles UPDATE without initial state', () => {
    const action = {
      type: UPDATE,
      state: {
        greeting: 'hello'
      }
    }
    const nextState = reducer(undefined, action)
    expect(nextState.greeting).toEqual('hello')
  })

  test('handles UPDATE', () => {
    const initialState: any = { greeting: 'hello', type: 'human' }
    const action = {
      type: UPDATE,
      state: {
        greeting: 'woff',
        type: 'dog'
      }
    }
    const nextState = dehydrate(reducer(initialState, action))
    expect(nextState.greeting).toEqual('woff')
    expect(nextState.type).toEqual('dog')
  })
  test('handles REPLACE', () => {
    const initialState: any = { greeting: 'hello', type: 'human' }
    const action = {
      type: REPLACE,
      state: {
        new: 'conf'
      }
    }
    const nextState = dehydrate(reducer(initialState, action))
    expect(nextState.greeting).toBeUndefined()
    expect(nextState.type).toBeUndefined()
    expect(nextState).toMatchSnapshot()
  })

  it('defaults playImplicitInitCommands to true', () => {
    expect(reducer(undefined, { type: 'dummy action' })).toEqual(
      expect.objectContaining({ playImplicitInitCommands: true })
    )
  })

  it('sets playImplicitInitCommands to false on DISABLE_IMPLICIT_INIT_COMMANDS', () => {
    expect(
      reducer(undefined, { type: DISABLE_IMPLICIT_INIT_COMMANDS })
    ).toEqual(expect.objectContaining({ playImplicitInitCommands: false }))
  })

  it('accepts new preset theme ids', () => {
    const themeIds = [
      NORD_THEME,
      SOLARIZED_LIGHT_THEME,
      BEARDED_VIVID_BLACK_THEME,
      BEARDED_OLED_THEME,
      BEARDED_MELLE_JULIET_LIGHT_THEME
    ]

    themeIds.forEach(themeId => {
      expect(
        reducer(undefined, { type: UPDATE, state: { theme: themeId } })
      ).toEqual(expect.objectContaining({ theme: themeId }))
    })
  })

  it('normalizes invalid theme ids to auto', () => {
    expect(
      reducer(undefined, { type: UPDATE, state: { theme: 'unknown-theme' } })
    ).toEqual(expect.objectContaining({ theme: AUTO_THEME }))
    expect(
      reducer({ ...reducer(undefined, { type: 'init' }), theme: 'bad' }, {
        type: APP_START
      } as any)
    ).toEqual(expect.objectContaining({ theme: AUTO_THEME }))
  })
})

describe('Selectors', () => {
  test("let getInitCmd be falsy and cast to empty string if that's the case", () => {
    // Given
    const tests = [
      { test: ':play start', expect: ':play start' },
      { test: null, expect: '' },
      { test: undefined, expect: '' },
      { test: '', expect: '' },
      { test: ' ', expect: '' },
      {
        test: '//Todays number is:\nRETURN rand()',
        expect: '//Todays number is:\nRETURN rand()'
      }
    ]

    // When && Then
    tests.forEach(t => {
      const state = {
        [NAME]: { initCmd: t.test }
      }
      expect(getInitCmd(state)).toEqual(t.expect)
    })
  })

  test('getTheme keeps valid ids and normalizes invalid values', () => {
    const themeIds = [
      NORD_THEME,
      SOLARIZED_LIGHT_THEME,
      BEARDED_VIVID_BLACK_THEME,
      BEARDED_OLED_THEME,
      BEARDED_MELLE_JULIET_LIGHT_THEME
    ]

    themeIds.forEach(themeId => {
      expect(getTheme({ [NAME]: { theme: themeId } })).toEqual(themeId)
    })
    expect(getTheme({ [NAME]: { theme: 'not-real' } })).toEqual(AUTO_THEME)
  })

  test('resolveTheme maps auto to normal or dark only', () => {
    expect(resolveTheme(AUTO_THEME)).toEqual(LIGHT_THEME)
    expect(resolveTheme(AUTO_THEME, DARK_THEME)).toEqual(DARK_THEME)
    expect(resolveTheme(AUTO_THEME, 'light')).toEqual(LIGHT_THEME)
    expect(resolveTheme(NORD_THEME, DARK_THEME)).toEqual(NORD_THEME)
    expect(resolveTheme(BEARDED_OLED_THEME, LIGHT_THEME)).toEqual(
      BEARDED_OLED_THEME
    )
  })
})
