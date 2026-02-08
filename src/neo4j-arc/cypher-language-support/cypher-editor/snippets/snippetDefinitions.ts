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
      "apoc.date.format(${1:date}, 'ms', '${2:yyyy-MM-dd}', '${3:America/Mexico_City}') AS dateString",
    documentation: 'Format a date using APOC date formatting',
    detail: 'apoc.date.format(date, unit, format, timezone)'
  },
  {
    label: 'dateformatfull',
    insertText:
      "apoc.date.format(${1:date}, 'ms', '${2:yyyy-MM-dd HH:mm:ss}', '${3:America/Mexico_City}') AS dateTimeString",
    documentation: 'Format a date with time using APOC date formatting',
    detail: 'apoc.date.format(date, unit, format, timezone)'
  },
  {
    label: 'customdate',
    insertText:
      "datetime({ year: ${1:2025}, month: ${2:1}, day: ${3:1}, hour: ${4:0}, minute: ${5:0}, timezone: '${7:America/Mexico_City}' }).epochMillis AS dateRange",
    documentation: 'Create a custom date and time as epoch milliseconds',
    detail: 'datetime() function with custom values'
  },
  {
    label: 'tsnow',
    insertText: 'timestamp() AS nowMs',
    documentation: 'Get the current timestamp in milliseconds',
    detail: 'timestamp() function'
  },
  {
    label: 'range_ms',
    insertText:
      'WHERE ${1:dateField} >= datetime({ epochMillis: ${2:startMs} }) AND ${1:dateField} < datetime({ epochMillis: ${3:endMs} })',
    documentation: 'Filter by a date range using epoch milliseconds',
    detail: 'Date range filter with epoch milliseconds'
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
  },
  {
    label: 'mergenode',
    insertText:
      'MERGE (${1:n}:${2:Label} { ${3:id}: ${4:idValue} })\n  ON CREATE SET ${1:n} += ${5:props}, ${1:n}.createdAt = timestamp()\n  ON MATCH  SET ${1:n} += ${6:props}, ${1:n}.updatedAt = timestamp()\n  RETURN ${1:n}',
    documentation: 'Merge a node with label and properties',
    detail: 'MERGE node pattern'
  },
  {
    label: 'return_map',
    insertText: 'RETURN ${1:n}{.*, ${2:extra1}: ${3:expr1}} AS ${4:row}',
    documentation: 'Return a node as a map with additional computed properties',
    detail: 'RETURN node as map with extra properties'
  },
  {
    label: 'uuid',
    insertText: 'apoc.create.uuid()',
    documentation: 'Generate a UUID using APOC',
    detail: 'apoc.create.uuid() function'
  },
  {
    label: 'createindexifnotexists',
    insertText:
      'CREATE INDEX ${1:index_name} IF NOT EXISTS\nFOR (${2:n}:${3:Label})\nON (${2:n}.${4:property});',
    documentation:
      'Create a Neo4j 4.4 node property index only if it does not already exist',
    detail: 'CREATE INDEX name IF NOT EXISTS FOR (n:Label) ON (n.property)'
  },
  {
    label: 'createindexcompositeifnotexists',
    insertText:
      'CREATE INDEX ${1:index_name} IF NOT EXISTS\nFOR (${2:n}:${3:Label})\nON (${2:n}.${4:property1}, ${2:n}.${5:property2});',
    documentation:
      'Create a Neo4j 4.4 composite node property index (multiple properties) only if it does not already exist',
    detail:
      'CREATE INDEX name IF NOT EXISTS FOR (n:Label) ON (n.prop1, n.prop2)'
  }
]
