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

// Mock for monaco-editor to avoid complex ESM imports in tests

const createMockDisposable = () => ({ dispose: jest.fn() })

const createMockEditor = () => ({
  getValue: jest.fn(() => ''),
  setValue: jest.fn(),
  getModel: jest.fn(() => ({
    getLinesContent: jest.fn(() => []),
    getLineCount: jest.fn(() => 1)
  })),
  getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
  setPosition: jest.fn(),
  focus: jest.fn(),
  layout: jest.fn(),
  dispose: jest.fn(),
  getContentHeight: jest.fn(() => 23),
  updateOptions: jest.fn(),
  trigger: jest.fn(),
  onDidChangeModelContent: jest.fn(() => createMockDisposable()),
  onDidContentSizeChange: jest.fn(() => createMockDisposable()),
  addAction: jest.fn(() => createMockDisposable()),
  addCommand: jest.fn(() => null)
})

const editor = {
  create: jest.fn(() => createMockEditor()),
  setModelMarkers: jest.fn(),
  getModelMarkers: jest.fn(() => []),
  defineTheme: jest.fn(),
  setTheme: jest.fn(),
  ShowLightbulbIconMode: {
    Off: 'off',
    On: 'on',
    OnCode: 'onCode'
  }
}

const languages = {
  register: jest.fn(),
  setMonarchTokensProvider: jest.fn(),
  setLanguageConfiguration: jest.fn(),
  registerCompletionItemProvider: jest.fn(() => createMockDisposable()),
  CompletionItemKind: {
    Function: 1,
    Field: 4,
    Property: 9,
    Keyword: 14
  }
}

const KeyCode = {
  Enter: 3,
  Escape: 9,
  UpArrow: 16,
  DownArrow: 18,
  Period: 47
}

const KeyMod = {
  Shift: 1024,
  CtrlCmd: 2048,
  Alt: 512,
  WinCtrl: 256
}

const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8
}

module.exports = {
  editor,
  languages,
  KeyCode,
  KeyMod,
  MarkerSeverity
}
