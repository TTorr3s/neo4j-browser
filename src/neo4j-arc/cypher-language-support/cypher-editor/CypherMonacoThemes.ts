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
import { editor } from 'monaco-editor/editor/editor.api'

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
export type MonacoThemeId =
  | 'normal'
  | 'outline'
  | 'dark'
  | 'nord'
  | 'solarizedLight'
  | 'beardedVividBlack'
  | 'beardedOled'
  | 'beardedMelleJulietLight'

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
): Record<MonacoThemeId, editor.IStandaloneThemeData> => {
  const storm = tokyoNightStormColors
  const light = tokyoNightLightColors

  type CypherMonacoPalette = {
    base: 'vs' | 'vs-dark'
    background: string
    foreground: string
    foregroundBright: string
    foregroundMuted: string
    comment: string
    selection: string
    lineHighlight: string
    widgetBackground: string
    widgetBorder: string
    widgetSelectedBackground: string
    inputBackground: string
    dropdownBackground: string
    string: string
    number: string
    keyword: string
    label: string
    variable: string
    property: string
    function: string
    parameter: string
    consoleCommand: string
    procedureOutput: string
  }

  const makeCypherTokenThemeRule = (token: string, foreground: string) => ({
    token: `${token}.cypher`,
    foreground
  })

  const buildRules = (
    colors: CypherMonacoPalette
  ): editor.ITokenThemeRule[] => [
    // Strings - green
    ...strings.map(token => makeCypherTokenThemeRule(token, colors.string)),
    ...stringQuotes.map(token =>
      makeCypherTokenThemeRule(token, colors.string)
    ),
    ...stringContents.map(token =>
      makeCypherTokenThemeRule(token, colors.string)
    ),

    // Numbers - orange
    ...numbers.map(token => makeCypherTokenThemeRule(token, colors.number)),

    // Keywords - purple (Control Keywords)
    ...keywords.map(token => makeCypherTokenThemeRule(token, colors.keyword)),

    // Labels and relationship types - red (HTML elements style)
    ...labels.map(token => makeCypherTokenThemeRule(token, colors.label)),
    ...relationshipTypes.map(token =>
      makeCypherTokenThemeRule(token, colors.label)
    ),

    // Variables - white/bright foreground
    ...variables.map(token => makeCypherTokenThemeRule(token, colors.variable)),

    // Properties - blue (Object properties)
    ...properties.map(token =>
      makeCypherTokenThemeRule(token, colors.property)
    ),

    // Functions and procedures - blue bright (Function names)
    ...procedures.map(token =>
      makeCypherTokenThemeRule(token, colors.function)
    ),
    ...functions.map(token => makeCypherTokenThemeRule(token, colors.function)),

    // Parameters - cyan bright
    ...parameters.map(token =>
      makeCypherTokenThemeRule(token, colors.parameter)
    ),

    // Console commands - cyan
    ...consoleCommands.map(token =>
      makeCypherTokenThemeRule(token, colors.consoleCommand)
    ),

    // Procedure output - green cyan
    ...procedureOutput.map(token =>
      makeCypherTokenThemeRule(token, colors.procedureOutput)
    ),

    // Comments - muted gray
    ...comments.map(token => makeCypherTokenThemeRule(token, colors.comment)),

    // Operators - foreground muted
    ...operators.map(token =>
      makeCypherTokenThemeRule(token, colors.foregroundMuted)
    ),

    // Tokens without highlighting - default foreground
    ...tokensWithoutSyntaxHighlighting.map(token =>
      makeCypherTokenThemeRule(token, colors.foreground)
    ),

    { token: 'string', foreground: colors.string },
    { token: 'string.cypher', foreground: colors.string },
    { token: 'string.quote', foreground: colors.string },
    { token: 'string.quote.cypher', foreground: colors.string },
    { token: 'string.delimiter', foreground: colors.string },
    { token: 'string.delimiter.cypher', foreground: colors.string }
  ]

  const buildTheme = (
    colors: CypherMonacoPalette
  ): editor.IStandaloneThemeData => ({
    base: colors.base,
    inherit: true,
    rules: buildRules(colors),
    colors: {
      'editor.background': colors.background,
      'editor.foreground': colors.foreground,
      'editor.selectionBackground': colors.selection,
      'editor.lineHighlightBackground': colors.lineHighlight,
      'editorCursor.foreground': colors.foregroundBright,
      'editorLineNumber.foreground': colors.comment,
      'editorLineNumber.activeForeground': colors.foreground,
      foreground: colors.foreground,
      'editorWidget.background': colors.widgetBackground,
      'editorSuggestWidget.background': colors.widgetBackground,
      'editorSuggestWidget.border': colors.widgetBorder,
      'editorSuggestWidget.foreground': colors.foreground,
      'editorSuggestWidget.selectedBackground': colors.widgetSelectedBackground,
      'editorHoverWidget.background': colors.widgetBackground,
      'editorHoverWidget.border': colors.widgetBorder,
      'input.background': colors.inputBackground,
      'input.foreground': colors.foreground,
      'input.border': colors.widgetBorder,
      'dropdown.background': colors.dropdownBackground,
      'dropdown.foreground': colors.foreground,
      'dropdown.border': colors.widgetBorder
    }
  })

  const normal: CypherMonacoPalette = {
    base: 'vs',
    background: light.background,
    foreground: light.foreground,
    foregroundBright: light.foreground,
    foregroundMuted: light.foregroundMuted,
    comment: light.comment,
    selection: light.selection,
    lineHighlight: '#f5f5f5',
    widgetBackground: '#f5f5f5',
    widgetBorder: '#e0e0e0',
    widgetSelectedBackground: '#e8e8e8',
    inputBackground: '#f5f5f5',
    dropdownBackground: '#f5f5f5',
    string: light.green,
    number: light.orange,
    keyword: light.purple,
    label: light.red,
    variable: light.black,
    property: light.blue,
    function: light.blueBright,
    parameter: light.cyan,
    consoleCommand: light.cyan,
    procedureOutput: light.greenCyan
  }

  const outline: CypherMonacoPalette = {
    ...normal,
    background: '#ffffff',
    foreground: '#000000',
    foregroundBright: '#000000',
    foregroundMuted: '#000000',
    comment: '#555555',
    selection: '#d9d9d9',
    lineHighlight: '#f0f0f0',
    widgetBackground: '#ffffff',
    widgetBorder: '#000000',
    widgetSelectedBackground: '#d9d9d9',
    inputBackground: '#ffffff',
    dropdownBackground: '#ffffff',
    string: '#000000',
    number: '#000000',
    keyword: '#000000',
    label: '#000000',
    variable: '#000000',
    property: '#000000',
    function: '#000000',
    parameter: '#000000',
    consoleCommand: '#000000',
    procedureOutput: '#000000'
  }

  const dark: CypherMonacoPalette = {
    base: 'vs-dark',
    background: storm.background,
    foreground: storm.foreground,
    foregroundBright: storm.foregroundBright,
    foregroundMuted: storm.foregroundMuted,
    comment: storm.comment,
    selection: storm.selection,
    lineHighlight: '#1f2335',
    widgetBackground: '#16161e',
    widgetBorder: storm.selection,
    widgetSelectedBackground: storm.selection,
    inputBackground: '#16161e',
    dropdownBackground: '#16161e',
    string: storm.green,
    number: storm.orange,
    keyword: storm.purple,
    label: storm.red,
    variable: storm.white,
    property: storm.blue,
    function: storm.blueBright,
    parameter: storm.cyanBright,
    consoleCommand: storm.cyanBright,
    procedureOutput: storm.greenCyan
  }

  const nord: CypherMonacoPalette = {
    base: 'vs-dark',
    background: '#2E3440',
    foreground: '#D8DEE9',
    foregroundBright: '#ECEFF4',
    foregroundMuted: '#81A1C1',
    comment: '#4C566A',
    selection: '#434C5E',
    lineHighlight: '#3B4252',
    widgetBackground: '#242933',
    widgetBorder: '#434C5E',
    widgetSelectedBackground: '#434C5E',
    inputBackground: '#242933',
    dropdownBackground: '#242933',
    string: '#A3BE8C',
    number: '#D08770',
    keyword: '#B48EAD',
    label: '#BF616A',
    variable: '#ECEFF4',
    property: '#81A1C1',
    function: '#5E81AC',
    parameter: '#88C0D0',
    consoleCommand: '#88C0D0',
    procedureOutput: '#8FBCBB'
  }

  const solarizedLight: CypherMonacoPalette = {
    base: 'vs',
    background: '#FDF6E3',
    foreground: '#657B83',
    foregroundBright: '#073642',
    foregroundMuted: '#586E75',
    comment: '#93A1A1',
    selection: '#EEE8D5',
    lineHighlight: '#F7F0DC',
    widgetBackground: '#EEE8D5',
    widgetBorder: '#93A1A1',
    widgetSelectedBackground: '#E8DFC8',
    inputBackground: '#FDF6E3',
    dropdownBackground: '#FDF6E3',
    string: '#859900',
    number: '#CB4B16',
    keyword: '#6C71C4',
    label: '#DC322F',
    variable: '#073642',
    property: '#268BD2',
    function: '#268BD2',
    parameter: '#2AA198',
    consoleCommand: '#2AA198',
    procedureOutput: '#859900'
  }

  const beardedVividBlack: CypherMonacoPalette = {
    base: 'vs-dark',
    background: '#141417',
    foreground: '#d7d7de',
    foregroundBright: '#f0f0f4',
    foregroundMuted: '#888894',
    comment: '#6d6d76',
    selection: '#313139',
    lineHighlight: '#202024',
    widgetBackground: '#0f0f12',
    widgetBorder: '#313139',
    widgetSelectedBackground: '#313139',
    inputBackground: '#0f0f12',
    dropdownBackground: '#0f0f12',
    string: '#42DD76',
    number: '#FF7135',
    keyword: '#A95EFF',
    label: '#FF478D',
    variable: '#f0f0f4',
    property: '#28A9FF',
    function: '#14E5D4',
    parameter: '#FFB638',
    consoleCommand: '#14E5D4',
    procedureOutput: '#b7d175'
  }

  const beardedOled: CypherMonacoPalette = {
    base: 'vs-dark',
    background: '#000000',
    foreground: '#d6d6d6',
    foregroundBright: '#f2f2f2',
    foregroundMuted: '#858585',
    comment: '#6f6f6f',
    selection: '#262626',
    lineHighlight: '#151515',
    widgetBackground: '#050505',
    widgetBorder: '#262626',
    widgetSelectedBackground: '#262626',
    inputBackground: '#050505',
    dropdownBackground: '#050505',
    string: '#5CD4C3',
    number: '#E79E69',
    keyword: '#B69EDE',
    label: '#E87474',
    variable: '#f2f2f2',
    property: '#63BBE5',
    function: '#6EA7E8',
    parameter: '#6AD3CD',
    consoleCommand: '#6AD3CD',
    procedureOutput: '#5CD4C3'
  }

  const beardedMelleJulietLight: CypherMonacoPalette = {
    base: 'vs',
    background: '#edeeee',
    foreground: '#1f3839',
    foregroundBright: '#102d2f',
    foregroundMuted: '#607173',
    comment: '#7a898b',
    selection: '#d7dddd',
    lineHighlight: '#e2e7e7',
    widgetBackground: '#f7f8f8',
    widgetBorder: '#bdcaca',
    widgetSelectedBackground: '#d7dddd',
    inputBackground: '#f7f8f8',
    dropdownBackground: '#f7f8f8',
    string: '#2aa54d',
    number: '#c97a2a',
    keyword: '#7c68ef',
    label: '#d24545',
    variable: '#1f3839',
    property: '#1f89cf',
    function: '#39a9b4',
    parameter: '#23716d',
    consoleCommand: '#23716d',
    procedureOutput: '#81a622'
  }

  return {
    normal: buildTheme(normal),
    outline: buildTheme(outline),
    dark: buildTheme(dark),
    nord: buildTheme(nord),
    solarizedLight: buildTheme(solarizedLight),
    beardedVividBlack: buildTheme(beardedVividBlack),
    beardedOled: buildTheme(beardedOled),
    beardedMelleJulietLight: buildTheme(beardedMelleJulietLight)
  }
}
