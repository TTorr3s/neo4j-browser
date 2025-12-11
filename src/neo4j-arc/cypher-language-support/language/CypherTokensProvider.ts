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
import { CypherLexer } from '@neo4j-cypher/antlr4'
import { languages } from 'monaco-editor/esm/vs/editor/editor.api'
import { createCypherLexer } from '@neo4j-cypher/editor-support'

class CypherState implements languages.IState {
  clone() {
    return new CypherState()
  }

  equals() {
    return true
  }
}

// Custom semantic token types
const LABEL_TOKEN = 'label'
const PROPERTY_TOKEN = 'property'
const VARIABLE_TOKEN = 'variable'
const COMMENT_TOKEN = 'comment'
const STRING_QUOTE_TOKEN = 'stringquote'
const STRING_CONTENT_TOKEN = 'stringcontent'

// Token types that indicate the next symbolic name is a label or relationship type
const COLON_TOKENS = ["':'"]
// Token types that indicate the next symbolic name is a property
const DOT_TOKENS = ["'.'"]
// Symbolic name tokens (including hexletter which captures a-f single letters)
const SYMBOLIC_NAME_TYPES = [
  'unescapedsymbolicname',
  'escapedsymbolicname',
  'hexletter'
]

interface RawToken {
  type: number
  column: number
  text: string
}

export class CypherTokensProvider implements languages.TokensProvider {
  getInitialState(): CypherState {
    return new CypherState()
  }

  tokenize(line: string): languages.ILineTokens {
    const lexer = createCypherLexer(line) as unknown as CypherLexer

    const allTokens = lexer.getAllTokens() as Array<{
      type: number
      column: number
      text: string | null
    }>

    const rawTokens: RawToken[] = allTokens
      .filter(token => token !== null && token.type !== -1)
      .map(token => ({
        type: token.type,
        column: token.column,
        text: token.text ?? ''
      }))
      .sort((a, b) => a.column - b.column)

    const resultTokens: languages.IToken[] = []

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i]
      const tokenName = (
        CypherLexer.symbolicNames[token.type] ??
        CypherLexer.literalNames[token.type] ??
        ''
      ).toLowerCase()

      // Check if this is a comment (lexer treats comments as 'sp' tokens)
      if (tokenName === 'sp' || tokenName === 'whitespace') {
        const trimmedText = token.text.trim()
        if (trimmedText.startsWith('//') || trimmedText.startsWith('/*')) {
          // This is a comment
          resultTokens.push({
            scopes: `${COMMENT_TOKEN}.cypher`,
            startIndex: token.column
          })
          continue
        }
      }

      // Check if this is a string literal - split into quote and content tokens
      if (tokenName === 'stringliteral') {
        const text = token.text
        const quoteChar = text.charAt(0) // ' or "

        // Opening quote
        resultTokens.push({
          scopes: `${STRING_QUOTE_TOKEN}.cypher`,
          startIndex: token.column
        })

        // String content (if there is any between the quotes)
        if (text.length > 2) {
          resultTokens.push({
            scopes: `${STRING_CONTENT_TOKEN}.cypher`,
            startIndex: token.column + 1
          })
        }

        // Closing quote (if the string is properly closed)
        if (text.length >= 2 && text.endsWith(quoteChar)) {
          resultTokens.push({
            scopes: `${STRING_QUOTE_TOKEN}.cypher`,
            startIndex: token.column + text.length - 1
          })
        }
        continue
      }

      // Check if this is a symbolic name that needs semantic classification
      if (SYMBOLIC_NAME_TYPES.includes(tokenName)) {
        // Look at previous non-whitespace token to determine context
        const prevToken = this.findPreviousNonWhitespaceToken(rawTokens, i)
        const prevTokenName = prevToken
          ? (
              CypherLexer.symbolicNames[prevToken.type] ??
              CypherLexer.literalNames[prevToken.type] ??
              ''
            ).toLowerCase()
          : ''

        let semanticType: string

        if (COLON_TOKENS.includes(prevTokenName)) {
          // After colon = label or relationship type
          semanticType = LABEL_TOKEN
        } else if (DOT_TOKENS.includes(prevTokenName)) {
          // After dot = property access
          semanticType = PROPERTY_TOKEN
        } else {
          // Otherwise it's a variable
          semanticType = VARIABLE_TOKEN
        }

        resultTokens.push({
          scopes: `${semanticType}.cypher`,
          startIndex: token.column
        })
      } else {
        // Use the original token name
        resultTokens.push({
          scopes: `${tokenName}.cypher`,
          startIndex: token.column
        })
      }
    }

    return {
      endState: new CypherState(),
      tokens: resultTokens
    }
  }

  private findPreviousNonWhitespaceToken(
    tokens: RawToken[],
    currentIndex: number
  ): RawToken | null {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const tokenName = (
        CypherLexer.symbolicNames[tokens[i].type] ??
        CypherLexer.literalNames[tokens[i].type] ??
        ''
      ).toLowerCase()

      // Skip whitespace and space tokens (but not if they are comments)
      if (tokenName === 'sp' || tokenName === 'whitespace') {
        const text = tokens[i].text.trim()
        if (!text.startsWith('//') && !text.startsWith('/*')) {
          continue
        }
      }
      return tokens[i]
    }
    return null
  }
}
