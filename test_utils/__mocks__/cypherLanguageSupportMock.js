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

// Mock for neo4j-arc/cypher-language-support to avoid monaco-editor import issues in tests

const CypherEditor = () => null

const setupAutocomplete = jest.fn()
const setEditorTheme = jest.fn()
const initalizeCypherSupport = jest.fn()

// Implement real getText logic for testing
const stripSurroundingBackticks = str =>
  str.charAt(0) === '`' && str.charAt(str.length - 1) === '`'
    ? str.substring(1, str.length - 1)
    : str

const getText = item =>
  ['function', 'procedure'].includes(item.type)
    ? stripSurroundingBackticks(item.content)
    : item.content

const parseQueryOrCommand = jest.fn(() => ({ type: 'query' }))
const createCypherLexer = jest.fn()
const extractStatements = jest.fn(() => [])

const toFunction = jest.fn(f => ({ name: f }))
const toLabel = jest.fn(l => ({ label: l }))
const toProcedure = jest.fn(p => ({ name: p }))
const toRelationshipType = jest.fn(r => ({ relationshipType: r }))

module.exports = {
  CypherEditor,
  setupAutocomplete,
  setEditorTheme,
  initalizeCypherSupport,
  getText,
  parseQueryOrCommand,
  createCypherLexer,
  extractStatements,
  toFunction,
  toLabel,
  toProcedure,
  toRelationshipType
}
