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

import { languages, IRange } from 'monaco-editor/esm/vs/editor/editor.api'

import { snippetDefinitions } from './snippetDefinitions'

const SNIPPET_SORT_PREFIX = 'ZZZ'

function formatSortText(index: number): string {
  return `${SNIPPET_SORT_PREFIX}${index.toString().padStart(3, '0')}`
}

export function getCustomSnippets(range: IRange): languages.CompletionItem[] {
  return snippetDefinitions.map((snippet, index) => ({
    label: snippet.label,
    kind: languages.CompletionItemKind.Snippet,
    insertText: snippet.insertText,
    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: snippet.documentation,
    detail: snippet.detail,
    range,
    sortText: formatSortText(index)
  }))
}
