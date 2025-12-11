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

import type { CustomSnippet } from './types'

export const snippetDefinitions: CustomSnippet[] = [
  // Date/Time snippets
  {
    label: 'dateformat',
    insertText:
      "apoc.date.format(${1:date}, 'ms', '${2:yyyy-MM-dd}', '${3:America/Mexico_City}')",
    documentation: 'Format a date using APOC date formatting',
    detail: 'apoc.date.format(date, unit, format, timezone)'
  },
  {
    label: 'fulldateformat',
    insertText:
      "apoc.date.format(${1:date}, 'ms', '${2:yyyy-MM-dd HH:mm:ss}', '${3:America/Mexico_City}')",
    documentation: 'Format a date with time using APOC date formatting',
    detail: 'apoc.date.format(date, unit, format, timezone)'
  },
  {
    label: 'now',
    insertText:
      "datetime({ timezone: '${1:America/Mexico_City}' }).epochMillis",
    documentation: 'Get the current date and time as epoch milliseconds',
    detail: 'datetime() function'
  },
  {
    label: 'customdate',
    insertText:
      "datetime({ year: ${1:2023}, month: ${2:1}, day: ${3:1}, hour: ${4:0}, minute: ${5:0}, second: ${6:0}, timezone: '${7:America/Mexico_City}' }).epochMillis",
    documentation: 'Create a custom date and time as epoch milliseconds',
    detail: 'datetime() function with custom values'
  },

  // Query snippets
  {
    label: 'matchproperty',
    insertText:
      'MATCH (${1:n}:${2:Label} { ${3:property}: ${4:value} }) RETURN ${1:n}{.*}',
    documentation: 'Match nodes by label and inline property filter',
    detail: 'MATCH pattern with inline property'
  },
  {
    label: 'matchequals',
    insertText:
      'MATCH (${1:n}:${2:Label}) WHERE ${1:n}.${3:property} = ${4:value} RETURN ${1:n}{.*}',
    documentation: 'Match nodes by label and WHERE clause',
    detail: 'MATCH pattern with WHERE clause'
  },
  {
    label: 'createnode',
    insertText:
      'CREATE (${1:n}:${2:Label} {${3:property}: ${4:value}}) RETURN ${1:n}',
    documentation: 'Create a new node with label and properties',
    detail: 'CREATE node pattern'
  },
  {
    label: 'unwind',
    insertText: 'UNWIND ${1:list} AS ${2:item}\nRETURN ${2:item}',
    documentation: 'Unwind a list into individual rows',
    detail: 'UNWIND list AS item'
  },
  {
    label: 'casewhen',
    insertText:
      'CASE ${1:expression}\n  WHEN ${2:value1} THEN ${3:result1}\n  WHEN ${4:value2} THEN ${5:result2}\n  ELSE ${6:defaultResult}\nEND',
    documentation: 'Conditional expression with multiple branches',
    detail: 'CASE expression'
  }
]
