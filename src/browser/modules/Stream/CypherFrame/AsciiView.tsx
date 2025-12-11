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
/* eslint-disable react/prop-types */
import asciitable from 'ascii-data-table'
import React, { memo, useCallback, useEffect, useState } from 'react'
import { connect } from 'react-redux'

import { WarningMessage } from 'neo4j-arc/common'

import {
  PaddedDiv,
  StyledAsciiPre,
  StyledBodyMessage,
  StyledRightPartial,
  StyledStatsBar,
  StyledWidthSlider,
  StyledWidthSliderContainer
} from '../styled'
import {
  getBodyAndStatusBarMessages,
  getRecordsToDisplayInTable,
  recordToStringArray,
  resultHasTruncatedFields
} from './helpers'
import Ellipsis from 'browser-components/Ellipsis'
import { GlobalState } from 'shared/globalState'
import { BrowserRequestResult } from 'shared/modules/requests/requestsDuck'
import { getMaxFieldItems } from 'shared/modules/settings/settingsDuck'

interface BaseAsciiViewComponentProps {
  result: BrowserRequestResult
  updated?: number
  maxRows: number
  asciiSetColWidth?: string
  setAsciiMaxColWidth: (asciiMaxColWidth: number) => void
}
interface AsciiViewComponentProps extends BaseAsciiViewComponentProps {
  maxFieldItems: number
}

interface AsciiViewComponentState {
  serializedRows: string[][]
  bodyMessage: string | null
}

/**
 * Replaces newline characters with a double \\ to escape newline in render
 */
function removeNewlines(serializedRows: string[][]): string[][] {
  return serializedRows.map(row => {
    return row.map(value => value.replace('\n', '\\n'))
  })
}

function arePropsEqual(
  prevProps: AsciiViewComponentProps,
  nextProps: AsciiViewComponentProps
): boolean {
  return (
    nextProps.result !== undefined &&
    nextProps.updated === prevProps.updated &&
    nextProps.maxRows === prevProps.maxRows &&
    nextProps.asciiSetColWidth === prevProps.asciiSetColWidth
  )
}

export const AsciiViewComponent = memo(function AsciiViewComponent(
  props: AsciiViewComponentProps
): JSX.Element {
  const {
    result,
    maxRows,
    maxFieldItems,
    asciiSetColWidth: maxColWidth = 70,
    setAsciiMaxColWidth
  } = props

  const [state, setState] = useState<AsciiViewComponentState>({
    serializedRows: [],
    bodyMessage: ''
  })

  useEffect(() => {
    const { bodyMessage = null } =
      getBodyAndStatusBarMessages(result, maxRows) || {}

    const hasRecords = result && 'records' in result && result.records.length
    if (!hasRecords) {
      setState({ serializedRows: [], bodyMessage })
      return
    }

    const records = getRecordsToDisplayInTable(result, maxRows)

    if (records.length === 0) {
      const serializedRows: string[][] = []
      setState({ serializedRows, bodyMessage })
      const maxColWidthValue = asciitable.maxColumnWidth([])
      setAsciiMaxColWidth(maxColWidthValue)
      return
    }

    const cypherString = records.slice(0, maxFieldItems).map(record => {
      return recordToStringArray(record)
    })
    const serializedRows: string[][] = []
    if (cypherString.length > 0) {
      serializedRows.push(records[0].keys as string[])
      serializedRows.push(...cypherString)
    } else {
      serializedRows.push([])
    }
    setState({ serializedRows, bodyMessage })
    const maxColWidthValue = asciitable.maxColumnWidth(serializedRows)
    setAsciiMaxColWidth(maxColWidthValue)
  }, [result, maxRows, maxFieldItems, setAsciiMaxColWidth])

  const { serializedRows, bodyMessage } = state
  let contents = <StyledBodyMessage>{bodyMessage}</StyledBodyMessage>
  if (
    serializedRows !== undefined &&
    serializedRows.length &&
    serializedRows[0].length
  ) {
    const stripedRows = removeNewlines(serializedRows)
    contents = (
      <StyledAsciiPre>
        {asciitable.tableFromSerializedData(stripedRows, maxColWidth)}
      </StyledAsciiPre>
    )
  }
  return <PaddedDiv>{contents}</PaddedDiv>
}, arePropsEqual)

export const AsciiView = connect((state: GlobalState) => ({
  maxFieldItems: getMaxFieldItems(state)
}))(AsciiViewComponent)

interface BaseAsciiStatusbarComponentProps {
  asciiMaxColWidth?: number
  asciiSetColWidth?: string
  maxRows: number
  result: BrowserRequestResult
  setAsciiSetColWidth: (asciiSetColWidth: string) => void
  updated?: number
}

interface AsciiStatusbarComponentProps
  extends BaseAsciiStatusbarComponentProps {
  maxFieldItems: number
}
interface AsciiStatusbarComponentState {
  maxSliderWidth: number
  minSliderWidth: number
  maxColWidth: number | string
  statusBarMessage: string | null
  hasTruncatedFields: boolean
}

function areStatusbarPropsEqual(
  prevProps: AsciiStatusbarComponentProps,
  nextProps: AsciiStatusbarComponentProps
): boolean {
  return (
    prevProps.updated === nextProps.updated &&
    prevProps.asciiMaxColWidth === nextProps.asciiMaxColWidth &&
    prevProps.asciiSetColWidth === nextProps.asciiSetColWidth
  )
}

export const AsciiStatusbarComponent = memo(function AsciiStatusbarComponent(
  props: AsciiStatusbarComponentProps
): JSX.Element {
  const {
    result,
    maxRows,
    maxFieldItems,
    asciiMaxColWidth,
    setAsciiSetColWidth
  } = props

  const [state, setState] = useState<AsciiStatusbarComponentState>({
    maxSliderWidth: 140,
    minSliderWidth: 3,
    maxColWidth: 70,
    statusBarMessage: '',
    hasTruncatedFields: false
  })

  useEffect(() => {
    const { statusBarMessage = null } =
      getBodyAndStatusBarMessages(result, maxRows) || {}
    const hasTruncatedFields = resultHasTruncatedFields(result, maxFieldItems)
    setState(prevState => ({
      ...prevState,
      maxSliderWidth: asciiMaxColWidth || prevState.minSliderWidth,
      statusBarMessage,
      hasTruncatedFields
    }))
  }, [result, maxRows, maxFieldItems, asciiMaxColWidth])

  const setColWidthChanged = useCallback(
    (w: React.ChangeEvent<HTMLInputElement>): void => {
      const value = w.target.value
      setState(prevState => ({ ...prevState, maxColWidth: value }))
      setAsciiSetColWidth(value)
    },
    [setAsciiSetColWidth]
  )

  const hasRecords = result && 'records' in result && result.records.length
  const {
    maxColWidth,
    maxSliderWidth,
    hasTruncatedFields,
    minSliderWidth,
    statusBarMessage
  } = state

  return (
    <StyledStatsBar>
      {!hasRecords ? (
        <Ellipsis>{statusBarMessage}</Ellipsis>
      ) : (
        <>
          {hasTruncatedFields && (
            <WarningMessage text={'Record fields have been truncated.'} />
          )}
          <StyledRightPartial>
            <StyledWidthSliderContainer>
              Max column width:
              <StyledWidthSlider
                value={maxColWidth}
                onChange={setColWidthChanged}
                type="range"
                min={minSliderWidth}
                max={maxSliderWidth}
              />
            </StyledWidthSliderContainer>
          </StyledRightPartial>
        </>
      )}
    </StyledStatsBar>
  )
}, areStatusbarPropsEqual)

export const AsciiStatusbar = connect((state: GlobalState) => ({
  maxFieldItems: getMaxFieldItems(state)
}))(AsciiStatusbarComponent)
