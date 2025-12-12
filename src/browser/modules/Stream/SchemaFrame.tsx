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
import { replace, toUpper } from 'lodash-es'
import React, { useCallback, useEffect, useState, type JSX } from 'react'
import { connect } from 'react-redux'
import { withBus } from 'react-suber'
import semver, { SemVer } from 'semver'
import { v4 } from 'uuid'

import Slide from '../Carousel/Slide'
import FrameBodyTemplate from '../Frame/FrameBodyTemplate'
import {
  StyledBodyTr,
  StyledTable,
  StyledTd,
  StyledTh
} from 'browser-components/DataTables'
import Directives from 'browser-components/Directives'
import { GlobalState } from 'project-root/src/shared/globalState'
import { NEO4J_BROWSER_USER_ACTION_QUERY } from 'services/bolt/txMetadata'
import { CYPHER_REQUEST } from 'shared/modules/cypher/cypherDuck'
import {
  getCleanedVersion,
  getSemanticVersion
} from 'shared/modules/dbMeta/dbMetaDuck'
import { Bus } from 'suber'

type IndexesProps = {
  indexes: any
  neo4jVersion: SemVer | null
}
const Indexes = ({ indexes, neo4jVersion }: IndexesProps) => {
  if (
    !neo4jVersion ||
    !semver.valid(neo4jVersion) ||
    semver.satisfies(neo4jVersion, '<4.0.0-rc01')
  ) {
    const rows = indexes.map((index: any) => [
      `${replace(index.description, 'INDEX', '')} ${toUpper(index.state)} ${
        index.type === 'node_unique_property'
          ? '(for uniqueness constraint)'
          : ''
      }`
    ])

    return (
      <SchemaTable
        testid="schemaFrameIndexesTable"
        header={['Indexes']}
        rows={rows}
      />
    )
  }

  const rows = indexes.map((index: any) => [
    index.name,
    index.type,
    index.uniqueness,
    index.entityType,
    JSON.stringify(index.labelsOrTypes, null, 2),
    JSON.stringify(index.properties, null, 2),
    index.state
  ])

  const header = [
    'Index Name',
    'Type',
    'Uniqueness',
    'EntityType',
    'LabelsOrTypes',
    'Properties',
    'State'
  ]

  return (
    <SchemaTable testid="schemaFrameIndexesTable" header={header} rows={rows} />
  )
}

const Constraints = ({
  constraints,
  neo4jVersion
}: {
  constraints: any
  neo4jVersion: SemVer | null
}) => {
  let rows = []
  let header = []

  if (
    neo4jVersion &&
    semver.valid(neo4jVersion) &&
    semver.satisfies(neo4jVersion, '<4.2.*')
  ) {
    header = ['Constraints']

    rows = constraints.map((constraint: any) => [
      replace(constraint.description, 'CONSTRAINT', '')
    ])
  } else {
    header = [
      'Constraint Name',
      'Type',
      'EntityType',
      'LabelsOrTypes',
      'Properties'
    ]

    rows = constraints.map((constraint: any) => [
      constraint.name,
      constraint.type,
      constraint.entityType,
      JSON.stringify(constraint.labelsOrTypes, null, 2),
      JSON.stringify(constraint.properties, null, 2)
    ])
  }

  return (
    <SchemaTable
      testid="schemaFrameConstraintsTable"
      header={header}
      rows={rows}
    />
  )
}

const SchemaTable = ({ testid, header, rows }: any) => {
  const rowsOrNone =
    rows && rows.length
      ? rows
      : [header.map((_: any, i: any) => (i === 0 ? 'None' : ''))]

  const body = rowsOrNone.map((row: any) => (
    <StyledBodyTr className="table-row" key={v4()}>
      {row.map((cell: any) => (
        <StyledTd className="table-properties" key={v4()}>
          {cell}
        </StyledTd>
      ))}
    </StyledBodyTr>
  ))

  return (
    <StyledTable data-testid={testid}>
      <thead>
        <tr>
          {header.map((cell: any) => (
            <StyledTh className="table-header" key={v4()}>
              {cell}
            </StyledTh>
          ))}
        </tr>
      </thead>
      <tbody>{body}</tbody>
    </StyledTable>
  )
}

type SchemaFrameProps = {
  neo4jVersion: SemVer | null
  bus?: Bus
  indexes?: any
  constraints?: any
  frame?: {
    schemaRequestId?: string
  }
}

export const SchemaFrame = ({
  neo4jVersion,
  bus,
  indexes: propIndexes,
  constraints: propConstraints,
  frame
}: SchemaFrameProps): JSX.Element => {
  const [indexes, setIndexes] = useState<any[]>([])
  const [constraints, setConstraints] = useState<any[]>([])

  const createResponseHandler = useCallback(
    (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
      return (res: any) => {
        if (!res.success || !res.result || !res.result.records.length) {
          setter([])
          return
        }
        const out = res.result.records.map((rec: any) =>
          rec.keys.reduce((acc: any, key: any) => {
            acc[key] = rec.get(key)
            return acc
          }, {})
        )
        setter(out)
      }
    },
    []
  )

  const fetchData = useCallback(
    (version: SemVer | null) => {
      if (bus) {
        // Indexes
        bus.self(
          CYPHER_REQUEST,
          {
            query:
              version &&
              semver.valid(version) &&
              semver.satisfies(version, '<4.2.*')
                ? 'CALL db.indexes()'
                : 'SHOW INDEXES',
            queryType: NEO4J_BROWSER_USER_ACTION_QUERY
          },
          createResponseHandler(setIndexes)
        )
        // Constraints
        bus.self(
          CYPHER_REQUEST,
          {
            query:
              version &&
              semver.valid(version) &&
              semver.satisfies(version, '<4.2.*')
                ? 'CALL db.constraints()'
                : 'SHOW CONSTRAINTS',
            queryType: NEO4J_BROWSER_USER_ACTION_QUERY
          },
          createResponseHandler(setConstraints)
        )
      }
    },
    [bus, createResponseHandler]
  )

  // Initial data fetch and process props (componentDidMount equivalent)
  useEffect(() => {
    fetchData(neo4jVersion)

    if (propIndexes) {
      createResponseHandler(setIndexes)(propIndexes)
    }
    if (propConstraints) {
      createResponseHandler(setConstraints)(propConstraints)
    }
    // Only run on mount - neo4jVersion changes are handled by schemaRequestId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch when schemaRequestId changes (componentDidUpdate equivalent)
  const schemaRequestId = frame?.schemaRequestId
  useEffect(() => {
    // Skip the initial render - that's handled by the mount effect
    if (schemaRequestId !== undefined) {
      fetchData(neo4jVersion)
    }
    // We intentionally only react to schemaRequestId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaRequestId])

  const cleanedVersion =
    typeof neo4jVersion === 'string' ? getCleanedVersion(neo4jVersion) : null
  const schemaCommand =
    cleanedVersion && semver.satisfies(cleanedVersion, '<=3.4.*')
      ? 'CALL db.schema()'
      : 'CALL db.schema.visualization'

  const frameContent = (
    <Slide>
      <Indexes indexes={indexes} neo4jVersion={neo4jVersion} />
      <Constraints constraints={constraints} neo4jVersion={neo4jVersion} />
      <br />
      <p className="lead">
        Execute the following command to visualize what's related, and how
      </p>
      <figure>
        <pre className="code runnable">{schemaCommand}</pre>
      </figure>
    </Slide>
  )

  return (
    <div style={{ width: '100%' }}>
      <Directives content={frameContent} />
    </div>
  )
}

const Frame = (props: any) => {
  return (
    <FrameBodyTemplate
      isCollapsed={props.isCollapsed}
      isFullscreen={props.isFullscreen}
      contents={<SchemaFrame {...props} />}
    />
  )
}

const mapStateToProps = (state: GlobalState) => ({
  neo4jVersion: getSemanticVersion(state)
})

export default withBus(connect(mapStateToProps, null)(Frame))
