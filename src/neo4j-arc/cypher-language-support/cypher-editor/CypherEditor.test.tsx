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
import { render } from '@testing-library/react'
import * as monaco from 'monaco-editor/editor/editor.api'
import React from 'react'

import { CypherEditor } from './CypherEditor'

const noOp = () => undefined

describe('CypherEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <CypherEditor
        enableMultiStatementMode={true}
        fontLigatures={true}
        useDb={null}
        history={[]}
        onChange={noOp}
        onExecute={noOp}
        id="test-id"
        sendCypherQuery={
          (() => Promise.resolve({ summary: { notifications: [] } })) as any
        }
      />
    )

    expect(container.querySelector('#monaco-test-id')).toBeInTheDocument()
  })

  it('creates monaco editor on mount', () => {
    render(
      <CypherEditor
        enableMultiStatementMode={true}
        fontLigatures={true}
        useDb={null}
        history={[]}
        onChange={noOp}
        onExecute={noOp}
        id="test-id"
        sendCypherQuery={
          (() => Promise.resolve({ summary: { notifications: [] } })) as any
        }
      />
    )

    expect(monaco.editor.create).toHaveBeenCalled()
  })

  it('passes fontLigatures option to monaco editor', () => {
    render(
      <CypherEditor
        enableMultiStatementMode={true}
        fontLigatures={false}
        useDb={null}
        history={[]}
        onChange={noOp}
        onExecute={noOp}
        id="test-id"
        sendCypherQuery={
          (() => Promise.resolve({ summary: { notifications: [] } })) as any
        }
      />
    )

    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fontLigatures: false
      })
    )
  })

  it('sets initial value in monaco editor', () => {
    const initialValue = 'MATCH (n) RETURN n'

    render(
      <CypherEditor
        enableMultiStatementMode={true}
        fontLigatures={true}
        useDb={null}
        history={[]}
        onChange={noOp}
        onExecute={noOp}
        id="test-id"
        value={initialValue}
        sendCypherQuery={
          (() => Promise.resolve({ summary: { notifications: [] } })) as any
        }
      />
    )

    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        value: initialValue
      })
    )
  })

  it('renders with correct container id', () => {
    const { container } = render(
      <CypherEditor
        enableMultiStatementMode={true}
        fontLigatures={true}
        useDb={null}
        history={[]}
        onChange={noOp}
        onExecute={noOp}
        id="custom-id"
        sendCypherQuery={
          (() => Promise.resolve({ summary: { notifications: [] } })) as any
        }
      />
    )

    expect(container.querySelector('#monaco-custom-id')).toBeInTheDocument()
  })
})

describe('CypherEditor auto height', () => {
  // jsdom's viewport is 768px tall, so the auto ceiling is the 400px floor
  const AUTO_CEILING = 400

  type MockEditor = {
    layout: jest.Mock
    getContentHeight: jest.Mock
    onDidContentSizeChange: jest.Mock
  }

  function renderEditor(props: Record<string, unknown> = {}) {
    render(
      <CypherEditor
        enableMultiStatementMode={true}
        fontLigatures={true}
        useDb={null}
        history={[]}
        onChange={noOp}
        onExecute={noOp}
        id="height-test"
        sendCypherQuery={
          (() => Promise.resolve({ summary: { notifications: [] } })) as any
        }
        {...props}
      />
    )

    const editor = (monaco.editor.create as jest.Mock).mock.results[0]
      .value as MockEditor
    // The handler the editor registered for Monaco's content-size events
    const onContentSizeChange = editor.onDidContentSizeChange.mock
      .calls[0][0] as () => void

    return { editor, onContentSizeChange }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('grows to fit the content as the query gets longer', () => {
    const { editor, onContentSizeChange } = renderEditor()

    editor.getContentHeight.mockReturnValue(230)
    editor.layout.mockClear()
    onContentSizeChange()

    expect(editor.layout).toHaveBeenCalledWith(
      expect.objectContaining({ height: 230 })
    )
  })

  it('stops growing at the ceiling', () => {
    const { editor, onContentSizeChange } = renderEditor()

    editor.getContentHeight.mockReturnValue(5000)
    editor.layout.mockClear()
    onContentSizeChange()

    expect(editor.layout).toHaveBeenCalledWith(
      expect.objectContaining({ height: AUTO_CEILING })
    )
  })

  it('does not lay out again when the height is unchanged', () => {
    const { editor, onContentSizeChange } = renderEditor()

    editor.getContentHeight.mockReturnValue(230)
    onContentSizeChange()
    editor.layout.mockClear()

    // Monaco re-fires after a layout; without the guard this loops forever
    onContentSizeChange()
    onContentSizeChange()

    expect(editor.layout).not.toHaveBeenCalled()
  })

  it('ignores content growth once a height is pinned', () => {
    const { editor, onContentSizeChange } = renderEditor({
      heightMode: 'fixed',
      fixedHeight: 250
    })

    editor.getContentHeight.mockReturnValue(5000)
    editor.layout.mockClear()
    onContentSizeChange()

    expect(editor.layout).not.toHaveBeenCalled()
  })
})
