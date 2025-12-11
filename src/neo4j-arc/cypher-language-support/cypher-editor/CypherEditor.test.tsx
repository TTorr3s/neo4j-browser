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
import React from 'react'

import { CypherEditor } from './CypherEditor'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

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
        isFullscreen={false}
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
        isFullscreen={false}
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
        isFullscreen={false}
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
        isFullscreen={false}
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
        isFullscreen={false}
        id="custom-id"
        sendCypherQuery={
          (() => Promise.resolve({ summary: { notifications: [] } })) as any
        }
      />
    )

    expect(container.querySelector('#monaco-custom-id')).toBeInTheDocument()
  })
})
