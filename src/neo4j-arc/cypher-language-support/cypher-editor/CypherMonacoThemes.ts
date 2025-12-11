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
import { editor } from 'monaco-editor/esm/vs/editor/editor.api'

// Tokyo Night Storm color palette for Cypher syntax highlighting
// Inspired by enkia.tokyo-night VS Code extension
const tokyoNightStormColors = {
  // Editor colors (darkened)
  background: '#1a1b26', // Darkened from #24283b
  foreground: '#a9b1d6',
  foregroundBright: '#70748aff',
  foregroundMuted: '#9aa5ce',
  comment: '#565f89',
  selection: '#33467c', // Darkened from #414868

  // Syntax colors
  red: '#f7768e', // This keyword, HTML elements, Regex group symbol
  orange: '#ff9e64', // Number and Boolean constants
  yellow: '#e0af68', // Function parameters, Regex character sets
  yellowMuted: '#cfc9c2', // Parameters inside functions
  green: '#9ece6a', // Strings, CSS class names
  greenCyan: '#73daca', // Object literal keys, Markdown links
  cyan: '#b4f9f8', // Regex literal strings
  cyanBright: '#2ac3de', // Language support functions
  blue: '#7dcfff', // Object properties, Regex quantifiers
  blueBright: '#7aa2f7', // Function names, CSS property names
  purple: '#bb9af7', // Control Keywords, Storage Types
  white: '#c0caf5' // Variables, Class names
}

// Tokyo Night Light color palette
const tokyoNightLightColors = {
  // Editor colors
  background: '#ffffff',
  foreground: '#343b58',
  foregroundMuted: '#40434f',
  comment: '#6c6e75',
  selection: '#e8e8e8',

  // Syntax colors
  red: '#8c4351', // This keyword, HTML elements
  orange: '#965027', // Number and Boolean constants
  yellow: '#8f5e15', // Function parameters
  yellowMuted: '#634f30', // Parameters inside functions
  green: '#385f0d', // Strings, CSS class names
  greenCyan: '#33635c', // Object literal keys, Markdown links
  cyan: '#006c86', // Language support functions
  blue: '#0f4b6e', // Object properties
  blueBright: '#2959aa', // Function names
  purple: '#5a3e8e', // Control Keywords, Storage Types
  black: '#343b58' // Variables, Class names
}

export type CypherColorFallback = typeof tokyoNightStormColors

const comments: string[] = ['comment']
const strings: string[] = ['stringliteral', 'urlhex']
const stringQuotes: string[] = ['stringquote']
const stringContents: string[] = ['stringcontent']
const numbers: string[] = [
  'hexinteger',
  'decimalinteger',
  'octalinteger',
  'hexdigit',
  'digit',
  'nonzerodigit',
  'nonzerooctdigit',
  'octdigit',
  'zerodigit',
  'exponentdecimalreal',
  'regulardecimalreal'
]
const operators: string[] = [
  'identifierstart',
  'identifierpart',
  "';'",
  "':'",
  "'-'",
  "'=>'",
  "'://'",
  "'/'",
  "'.'",
  "'@'",
  "'#'",
  "'?'",
  "'&'",
  "'='",
  "'+'",
  "'{'",
  "','",
  "'}'",
  "'['",
  "']'",
  "'('",
  "')'",
  "'+='",
  "'|'",
  "'*'",
  "'..'",
  "'%'",
  "'^'",
  "'=~'",
  "'<>'",
  "'!='",
  "'<'",
  "'>'",
  "'<='",
  "'>='",
  "'$'",
  "'\u27E8'",
  "'\u3008'",
  "'\uFE64'",
  "'\uFF1C'",
  "'\u27E9'",
  "'\u3009'",
  "'\uFE65'",
  "'\uFF1E'",
  "'\u00AD'",
  "'\u2010'",
  "'\u2011'",
  "'\u2012'",
  "'\u2013'",
  "'\u2014'",
  "'\u2015'",
  "'\u2212'",
  "'\uFE58'",
  "'\uFE63'",
  "'\uFF0D'"
]
const keywords: string[] = [
  'access',
  'active',
  'alias',
  'admin',
  'administrator',
  'all',
  'allshortestpaths',
  'alter',
  'and',
  'any',
  'as',
  'asc',
  'ascending',
  'assert',
  'assign',
  'boosted',
  'identifier',
  'brief',
  'btree',
  'built',
  'by',
  'call',
  'case',
  'catalog',
  'change',
  'commit',
  'constraint',
  'constraints',
  'contains',
  'copy',
  'count',
  'create',
  'csv',
  'current',
  'cypher',
  'data',
  'database',
  'databases',
  'dbms',
  'default',
  'defined',
  'delete',
  'deny',
  'desc',
  'descending',
  'destroy',
  'detach',
  'distinct',
  'drop',
  'dump',
  'each',
  'element',
  'elements',
  'else',
  'encrypted',
  'end',
  'ends',
  'execute',
  'executable',
  'exist',
  'existence',
  'exists',
  'explain',
  'extract',
  'false',
  'fieldterminator',
  'filter',
  'for',
  'foreach',
  'from',
  'fulltext',
  'function',
  'functions',
  'grant',
  'graph',
  'graphs',
  'headers',
  'home',
  'if',
  'impersonate',
  'in',
  'index',
  'indexes',
  'is',
  'join',
  'key',
  'l_skip',
  'label',
  'labels',
  'limit',
  'load',
  'lookup',
  'management',
  'match',
  'merge',
  'name',
  'names',
  'new',
  'node',
  'nodes',
  'none',
  'not',
  'nowait',
  'null',
  'of',
  'on',
  'only',
  'optional',
  'options',
  'or',
  'order',
  'output',
  'password',
  'passwords',
  'periodic',
  'plaintext',
  'point',
  'populated',
  'privilege',
  'privileges',
  'procedure',
  'procedures',
  'profile',
  'property',
  'read',
  'reduce',
  'rel',
  'relationship',
  'relationships',
  'remove',
  'rename',
  'replace',
  'require',
  'required',
  'return',
  'revoke',
  'role',
  'roles',
  'scan',
  'sec',
  'second',
  'seconds',
  'seek',
  'set',
  'shortestpath',
  'show',
  'single',
  'skip',
  'start',
  'starts',
  'status',
  'stop',
  'suspended',
  'target',
  'terminate',
  'text',
  'then',
  'to',
  'transaction',
  'transactions',
  'traverse',
  'true',
  'type',
  'types',
  'union',
  'unique',
  'unwind',
  'use',
  'user',
  'users',
  'using',
  'verbose',
  'wait',
  'when',
  'where',
  'with',
  'write',
  'xor',
  'yield'
]
const labels: string[] = ['label']
const relationshipTypes: string[] = ['relationshiptype']
const variables: string[] = ['variable']
const properties: string[] = ['property']
const procedures: string[] = []
const functions: string[] = []
const parameters: string[] = []
const consoleCommands: string[] = []
const procedureOutput: string[] = []
const tokensWithoutSyntaxHighlighting: string[] = [
  'escapedchar',
  'sp',
  'whitespace',
  'error_token'
]

export const getMonacoThemes = (
  _color?: CypherColorFallback
): {
  monacoDarkTheme: editor.IStandaloneThemeData
  monacoLightTheme: editor.IStandaloneThemeData
} => {
  const storm = tokyoNightStormColors
  const light = tokyoNightLightColors

  const makeCypherTokenThemeRule = (token: string, foreground: string) => ({
    token: `${token}.cypher`,
    foreground
  })

  // Tokyo Night Storm (Dark) theme rules for Cypher
  const stormRules: editor.ITokenThemeRule[] = [
    // Strings - green
    ...strings.map(token => makeCypherTokenThemeRule(token, storm.green)),
    ...stringQuotes.map(token => makeCypherTokenThemeRule(token, storm.green)),
    ...stringContents.map(token =>
      makeCypherTokenThemeRule(token, storm.green)
    ),

    // Numbers - orange
    ...numbers.map(token => makeCypherTokenThemeRule(token, storm.orange)),

    // Keywords - purple (Control Keywords)
    ...keywords.map(token => makeCypherTokenThemeRule(token, storm.purple)),

    // Labels and relationship types - red (HTML elements style)
    ...labels.map(token => makeCypherTokenThemeRule(token, storm.red)),
    ...relationshipTypes.map(token =>
      makeCypherTokenThemeRule(token, storm.red)
    ),

    // Variables - white/bright foreground
    ...variables.map(token => makeCypherTokenThemeRule(token, storm.white)),

    // Properties - blue (Object properties)
    ...properties.map(token => makeCypherTokenThemeRule(token, storm.blue)),

    // Functions and procedures - blue bright (Function names)
    ...procedures.map(token =>
      makeCypherTokenThemeRule(token, storm.blueBright)
    ),
    ...functions.map(token =>
      makeCypherTokenThemeRule(token, storm.blueBright)
    ),

    // Parameters - cyan bright
    ...parameters.map(token =>
      makeCypherTokenThemeRule(token, storm.cyanBright)
    ),

    // Console commands - cyan
    ...consoleCommands.map(token =>
      makeCypherTokenThemeRule(token, storm.cyanBright)
    ),

    // Procedure output - green cyan
    ...procedureOutput.map(token =>
      makeCypherTokenThemeRule(token, storm.greenCyan)
    ),

    // Comments - muted gray
    ...comments.map(token => makeCypherTokenThemeRule(token, storm.comment)),

    // Operators - foreground muted
    ...operators.map(token =>
      makeCypherTokenThemeRule(token, storm.foregroundMuted)
    ),

    // Tokens without highlighting - default foreground
    ...tokensWithoutSyntaxHighlighting.map(token =>
      makeCypherTokenThemeRule(token, storm.foreground)
    )
  ]

  // Tokyo Night Light theme rules for Cypher
  const lightRules: editor.ITokenThemeRule[] = [
    // Strings - green
    ...strings.map(token => makeCypherTokenThemeRule(token, light.green)),
    ...stringQuotes.map(token => makeCypherTokenThemeRule(token, light.green)),
    ...stringContents.map(token =>
      makeCypherTokenThemeRule(token, light.green)
    ),

    // Numbers - orange
    ...numbers.map(token => makeCypherTokenThemeRule(token, light.orange)),

    // Keywords - purple (Control Keywords)
    ...keywords.map(token => makeCypherTokenThemeRule(token, light.purple)),

    // Labels and relationship types - red
    ...labels.map(token => makeCypherTokenThemeRule(token, light.red)),
    ...relationshipTypes.map(token =>
      makeCypherTokenThemeRule(token, light.red)
    ),

    // Variables - black/dark foreground
    ...variables.map(token => makeCypherTokenThemeRule(token, light.black)),

    // Properties - blue
    ...properties.map(token => makeCypherTokenThemeRule(token, light.blue)),

    // Functions and procedures - blue bright
    ...procedures.map(token =>
      makeCypherTokenThemeRule(token, light.blueBright)
    ),
    ...functions.map(token =>
      makeCypherTokenThemeRule(token, light.blueBright)
    ),

    // Parameters - cyan
    ...parameters.map(token => makeCypherTokenThemeRule(token, light.cyan)),

    // Console commands - cyan
    ...consoleCommands.map(token =>
      makeCypherTokenThemeRule(token, light.cyan)
    ),

    // Procedure output - green cyan
    ...procedureOutput.map(token =>
      makeCypherTokenThemeRule(token, light.greenCyan)
    ),

    // Comments - muted gray
    ...comments.map(token => makeCypherTokenThemeRule(token, light.comment)),

    // Operators - foreground muted
    ...operators.map(token =>
      makeCypherTokenThemeRule(token, light.foregroundMuted)
    ),

    // Tokens without highlighting - default foreground
    ...tokensWithoutSyntaxHighlighting.map(token =>
      makeCypherTokenThemeRule(token, light.foreground)
    )
  ]

  // Additional string override rules for Storm theme
  const stormStringOverrideRules: editor.ITokenThemeRule[] = [
    { token: 'string', foreground: storm.green },
    { token: 'string.cypher', foreground: storm.green },
    { token: 'string.quote', foreground: storm.green },
    { token: 'string.quote.cypher', foreground: storm.green },
    { token: 'string.delimiter', foreground: storm.green },
    { token: 'string.delimiter.cypher', foreground: storm.green }
  ]

  // Additional string override rules for Light theme
  const lightStringOverrideRules: editor.ITokenThemeRule[] = [
    { token: 'string', foreground: light.green },
    { token: 'string.cypher', foreground: light.green },
    { token: 'string.quote', foreground: light.green },
    { token: 'string.quote.cypher', foreground: light.green },
    { token: 'string.delimiter', foreground: light.green },
    { token: 'string.delimiter.cypher', foreground: light.green }
  ]

  const monacoDarkTheme: editor.IStandaloneThemeData = {
    base: 'vs-dark',
    inherit: true,
    rules: [...stormRules, ...stormStringOverrideRules],
    colors: {
      'editor.background': storm.background,
      'editor.foreground': storm.foreground,
      'editor.selectionBackground': storm.selection,
      'editor.lineHighlightBackground': '#1f2335', // Darkened from #292e42
      'editorCursor.foreground': storm.foregroundBright,
      'editorLineNumber.foreground': storm.comment,
      'editorLineNumber.activeForeground': storm.foreground,
      foreground: storm.foreground,
      'editorWidget.background': '#16161e', // Darkened from #1f2335
      'editorSuggestWidget.background': '#16161e', // Darkened from #1f2335
      'editorSuggestWidget.border': storm.selection,
      'editorSuggestWidget.foreground': storm.foreground,
      'editorSuggestWidget.selectedBackground': storm.selection,
      'editorHoverWidget.background': '#16161e', // Darkened from #1f2335
      'editorHoverWidget.border': storm.selection,
      'input.background': '#16161e', // Darkened from #1f2335
      'input.foreground': storm.foreground,
      'input.border': storm.selection,
      'dropdown.background': '#16161e', // Darkened from #1f2335
      'dropdown.foreground': storm.foreground,
      'dropdown.border': storm.selection
    }
  }

  const monacoLightTheme: editor.IStandaloneThemeData = {
    base: 'vs',
    inherit: true,
    rules: [...lightRules, ...lightStringOverrideRules],
    colors: {
      'editor.background': light.background,
      'editor.foreground': light.foreground,
      'editor.selectionBackground': light.selection,
      'editor.lineHighlightBackground': '#f5f5f5',
      'editorCursor.foreground': light.foreground,
      'editorLineNumber.foreground': light.comment,
      'editorLineNumber.activeForeground': light.foreground,
      foreground: light.foreground,
      'editorWidget.background': '#f5f5f5',
      'editorSuggestWidget.background': '#f5f5f5',
      'editorSuggestWidget.border': '#e0e0e0',
      'editorSuggestWidget.foreground': light.foreground,
      'editorSuggestWidget.selectedBackground': '#e8e8e8',
      'editorHoverWidget.background': '#f5f5f5',
      'editorHoverWidget.border': '#e0e0e0',
      'input.background': '#f5f5f5',
      'input.foreground': light.foreground,
      'input.border': '#e0e0e0',
      'dropdown.background': '#f5f5f5',
      'dropdown.foreground': light.foreground,
      'dropdown.border': '#e0e0e0'
    }
  }

  return { monacoDarkTheme, monacoLightTheme }
}
