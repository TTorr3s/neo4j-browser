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
import { saveAs } from 'services/exporting/fileSaver'
import { map } from 'lodash'
import { QueryResult, Record as Neo4jRecord } from 'neo4j-driver'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  AlertIcon,
  AsciiIcon,
  CodeIcon,
  ErrorIcon,
  PlanIcon,
  SpinnerIcon,
  TableIcon,
  VisualizationIcon
} from 'browser-components/icons/LegacyIcons'

import FrameBodyTemplate from '../../Frame/FrameBodyTemplate'
import FrameSidebar from '../../Frame/FrameSidebar'
import { BaseFrameProps } from '../Stream'
import { SpinnerContainer, StyledStatsBarContainer } from '../styled'
import { AsciiStatusbar, AsciiView } from './AsciiView'
import { CancelView } from './CancelView'
import { CodeStatusbar, CodeView } from './CodeView'
import { ErrorsStatusbar } from './ErrorsView/ErrorsStatusbar'
import { ErrorsView } from './ErrorsView/ErrorsView'
import { PlanStatusbar, PlanView } from './PlanView'
import RelatableView, {
  RelatableStatusbar
} from './RelatableView/relatable-view'
import { VisualizationConnectedBus } from './VisualizationView/VisualizationView'
import { WarningsStatusbar, WarningsView } from './WarningsView'
import {
  recordToStringArray,
  initialView,
  recordToJSONMapper,
  resultHasNodes,
  resultHasPlan,
  resultHasRows,
  resultHasWarnings,
  resultIsError,
  stringifyResultArray
} from './helpers'
import Centered from 'browser-components/Centered'
import Display from 'browser-components/Display'
import { CypherFrameButton } from 'browser-components/buttons'
import { StyledFrameBody } from 'browser/modules/Frame/styled'
import { csvFormat, stringModifier } from 'services/bolt/cypherTypesFormatting'
import { downloadPNGFromSVG, downloadSVG } from 'services/exporting/imageUtils'
import { ExportType, GraphElement } from 'services/exporting/svgUtils'
import { CSVSerializer } from 'services/serializer'
import { stringifyMod } from 'services/utils'
import { GlobalState } from 'shared/globalState'
import * as ViewTypes from 'shared/modules/frames/frameViewTypes'
import {
  Frame,
  getRecentView,
  setRecentView
} from 'shared/modules/frames/framesDuck'
import {
  BrowserRequest,
  BrowserRequestResult,
  REQUEST_STATUS_PENDING,
  REQUEST_STATUS_SUCCESS,
  getRequest,
  isCancelStatus
} from 'shared/modules/requests/requestsDuck'
import {
  getInitialNodeDisplay,
  getMaxNeighbours,
  getMaxRows,
  shouldAutoComplete
} from 'shared/modules/settings/settingsDuck'

function isQueryResult(result: BrowserRequestResult): result is QueryResult {
  return result !== null && result !== undefined && 'summary' in result
}

export type CypherFrameProps = BaseFrameProps

export type PlanExpand = 'EXPAND' | 'COLLAPSE'

type VisElement = {
  svgElement: SVGElement
  graphElement: GraphElement
  type: ExportType
}

function CypherFrameComponent(props: CypherFrameProps): JSX.Element {
  const {
    frame = {} as Frame,
    isCollapsed,
    isFullscreen,
    setExportItems
  } = props

  const dispatch = useDispatch()

  // Selectors
  const maxRows = useSelector((state: GlobalState) => getMaxRows(state))
  const initialNodeDisplay = useSelector((state: GlobalState) =>
    getInitialNodeDisplay(state)
  )
  const maxNeighbours = useSelector((state: GlobalState) =>
    getMaxNeighbours(state)
  )
  const autoComplete = useSelector((state: GlobalState) =>
    shouldAutoComplete(state)
  )
  const recentView = useSelector((state: GlobalState) => getRecentView(state))
  const request = useSelector((state: GlobalState) =>
    getRequest(state, frame.requestId)
  )

  // State
  const [openView, setOpenView] = useState<ViewTypes.FrameView | undefined>(
    undefined
  )
  const [hasVis, setHasVis] = useState<boolean>(false)
  const [asciiMaxColWidth, setAsciiMaxColWidth] = useState<number | undefined>(
    undefined
  )
  const [asciiSetColWidth, setAsciiSetColWidthState] = useState<
    string | undefined
  >(undefined)
  const [planExpand, setPlanExpand] = useState<PlanExpand>('EXPAND')

  // Refs
  const visElement = useRef<VisElement | null>(null)
  const prevRequestUpdated = useRef<number | undefined>(undefined)

  // Callbacks
  const onRecentViewChanged = useCallback(
    (view: ViewTypes.FrameView) => {
      dispatch(setRecentView(view))
    },
    [dispatch]
  )

  const changeView = useCallback(
    (view: ViewTypes.FrameView): void => {
      setOpenView(view)
      onRecentViewChanged(view)
    },
    [onRecentViewChanged]
  )

  // Memoized values
  const records = useMemo((): Neo4jRecord[] => {
    if (request?.result && 'records' in request.result) {
      return request.result.records
    }
    return []
  }, [request?.result])

  const canShowViz = useCallback((): boolean => {
    return resultHasNodes(request)
  }, [request])

  const hasStringPlan = useCallback((): boolean => {
    const result = request?.result
    if (!isQueryResult(result)) return false
    const plan = result.summary?.plan
    if (!plan) return false
    return !!plan.arguments?.['string-representation']
  }, [request?.result])

  // Export callbacks
  const exportCSV = useCallback(async (): Promise<void> => {
    const firstRecord = records[0]
    const keys = firstRecord?.length > 0 ? firstRecord.keys : []

    const exportData = stringifyResultArray(
      csvFormat,
      [keys].concat(records.map(record => recordToStringArray(record, true)))
    )
    const data = exportData.slice()
    const csv = CSVSerializer(data.shift())
    csv.appendRows(data)
    const blob = new Blob([csv.output()], {
      type: 'text/csv;charset=utf-8'
    })
    await saveAs(blob, 'export.csv')
  }, [records])

  const exportJSON = useCallback(async (): Promise<void> => {
    const exportData = map(records, recordToJSONMapper)
    const data = stringifyMod(exportData, stringModifier, true)
    const blob = new Blob([data], {
      type: 'application/json;charset=utf-8'
    })
    await saveAs(blob, 'records.json')
  }, [records])

  const exportStringPlan = useCallback(async (): Promise<void> => {
    const result = request?.result
    if (!isQueryResult(result)) return
    const plan = result.summary?.plan
    if (!plan) return
    const data = plan.arguments?.['string-representation']
    if (data) {
      const blob = new Blob([data], {
        type: 'text/plain;charset=utf-8'
      })
      await saveAs(blob, 'plan.txt')
    }
  }, [request?.result])

  const exportPNG = useCallback((): void => {
    if (visElement.current) {
      const { svgElement, graphElement, type } = visElement.current
      downloadPNGFromSVG(svgElement, graphElement, type)
    }
  }, [])

  const exportSVG = useCallback((): void => {
    if (visElement.current) {
      const { svgElement, graphElement, type } = visElement.current
      downloadSVG(svgElement, graphElement, type)
    }
  }, [])

  // Effect for initial view on mount
  useEffect(() => {
    const view = initialView({ request, frame, recentView }, { openView })
    if (view) {
      setOpenView(view)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Effect for handling request status changes
  useEffect(() => {
    // When going from REQUEST_STATUS_PENDING to some other status
    // we want to show an initial view.
    // This happens on first render of a response and on re-runs
    if (request?.status !== REQUEST_STATUS_PENDING) {
      const view = initialView({ request, frame, recentView }, { openView })
      if (view !== openView) {
        const newHasVis = view === ViewTypes.ERRORS ? false : hasVis
        setOpenView(view)
        if (newHasVis !== hasVis) {
          setHasVis(newHasVis)
        }
      }
    } else {
      visElement.current = null
      if (hasVis) {
        setHasVis(false)
      }
    }

    prevRequestUpdated.current = request?.updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.updated, request?.status])

  // Effect for resetting view when no visualization available
  useEffect(() => {
    const doneLoading = request?.status === REQUEST_STATUS_SUCCESS
    const currentlyShowingViz = openView === ViewTypes.VISUALIZATION
    if (doneLoading && currentlyShowingViz && !canShowViz()) {
      const view = initialView(
        { request, frame, recentView },
        { openView: undefined } // initial view was not meant to override another view
      )
      if (view) {
        setOpenView(view)
      }
    }
  }, [request?.status, openView, canShowViz, request, frame, recentView])

  // Effect for updating export items
  useEffect(() => {
    const textDownloadEnabled = () =>
      records.length > 0 &&
      openView &&
      [
        ViewTypes.TEXT,
        ViewTypes.TABLE,
        ViewTypes.CODE,
        ViewTypes.VISUALIZATION
      ].includes(openView)

    const graphicsDownloadEnabled = () =>
      visElement.current &&
      openView &&
      [ViewTypes.PLAN, ViewTypes.VISUALIZATION].includes(openView)

    const downloadText = [
      { name: 'CSV', download: exportCSV },
      { name: 'JSON', download: exportJSON }
    ]
    const downloadGraphics = [
      { name: 'PNG', download: exportPNG },
      { name: 'SVG', download: exportSVG }
    ]

    setExportItems([
      ...(textDownloadEnabled() ? downloadText : []),
      ...(hasStringPlan() && openView === ViewTypes.PLAN
        ? [{ name: 'TXT', download: exportStringPlan }]
        : []),
      ...(graphicsDownloadEnabled() ? downloadGraphics : [])
    ])
  }, [
    openView,
    records.length,
    hasVis,
    hasStringPlan,
    exportCSV,
    exportJSON,
    exportPNG,
    exportSVG,
    exportStringPlan,
    setExportItems
  ])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setExportItems([])
    }
  }, [setExportItems])

  // Sidebar render function
  const sidebar = useCallback(
    (): JSX.Element => (
      <FrameSidebar>
        {canShowViz() && (
          <CypherFrameButton
            data-testid="cypherFrameSidebarVisualization"
            selected={openView === ViewTypes.VISUALIZATION}
            onClick={() => {
              changeView(ViewTypes.VISUALIZATION)
            }}
          >
            <VisualizationIcon />
          </CypherFrameButton>
        )}
        {!resultIsError(request) && (
          <CypherFrameButton
            data-testid="cypherFrameSidebarTable"
            selected={openView === ViewTypes.TABLE}
            onClick={() => {
              changeView(ViewTypes.TABLE)
            }}
          >
            <TableIcon />
          </CypherFrameButton>
        )}
        {resultHasRows(request) && !resultIsError(request) && (
          <CypherFrameButton
            data-testid="cypherFrameSidebarAscii"
            selected={openView === ViewTypes.TEXT}
            onClick={() => {
              changeView(ViewTypes.TEXT)
            }}
          >
            <AsciiIcon />
          </CypherFrameButton>
        )}
        {resultHasPlan(request) && (
          <CypherFrameButton
            data-testid="cypherFrameSidebarPlan"
            selected={openView === ViewTypes.PLAN}
            onClick={() => changeView(ViewTypes.PLAN)}
          >
            <PlanIcon />
          </CypherFrameButton>
        )}
        {resultHasWarnings(request) && (
          <CypherFrameButton
            selected={openView === ViewTypes.WARNINGS}
            onClick={() => {
              changeView(ViewTypes.WARNINGS)
            }}
          >
            <AlertIcon />
          </CypherFrameButton>
        )}
        {resultIsError(request) ? (
          <CypherFrameButton
            selected={openView === ViewTypes.ERRORS}
            onClick={() => {
              changeView(ViewTypes.ERRORS)
            }}
          >
            <ErrorIcon />
          </CypherFrameButton>
        ) : (
          <CypherFrameButton
            data-testid="cypherFrameSidebarCode"
            selected={openView === ViewTypes.CODE}
            onClick={() => {
              changeView(ViewTypes.CODE)
            }}
          >
            <CodeIcon />
          </CypherFrameButton>
        )}
      </FrameSidebar>
    ),
    [canShowViz, openView, request, changeView]
  )

  const getSpinner = (): JSX.Element => {
    return (
      <Centered>
        <SpinnerContainer>
          <SpinnerIcon />
        </SpinnerContainer>
      </Centered>
    )
  }

  const getFrameContents = (
    req: BrowserRequest,
    result: BrowserRequestResult,
    query: string
  ): JSX.Element => {
    return (
      <StyledFrameBody
        data-testid="frame-loaded-contents"
        isFullscreen={isFullscreen}
        isCollapsed={isCollapsed}
        preventOverflow={openView === ViewTypes.VISUALIZATION}
        removePadding
      >
        <Display if={openView === ViewTypes.TEXT} lazy>
          <AsciiView
            asciiSetColWidth={asciiSetColWidth}
            maxRows={maxRows}
            result={result}
            updated={request?.updated}
            setAsciiMaxColWidth={setAsciiMaxColWidth}
          />
        </Display>
        <Display if={openView === ViewTypes.TABLE} lazy>
          <RelatableView updated={request?.updated} result={result} />
        </Display>
        <Display if={openView === ViewTypes.CODE} lazy>
          <CodeView result={result} request={req} query={query} />
        </Display>
        <Display if={openView === ViewTypes.ERRORS} lazy>
          <ErrorsView result={result} updated={request?.updated} />
        </Display>
        <Display if={openView === ViewTypes.WARNINGS} lazy>
          <WarningsView result={result} updated={request?.updated} />
        </Display>
        <Display if={openView === ViewTypes.PLAN} lazy>
          <PlanView
            planExpand={planExpand}
            result={result}
            updated={request?.updated}
            isFullscreen={isFullscreen}
            assignVisElement={(
              svgElement: SVGElement,
              graphElement: GraphElement
            ) => {
              visElement.current = { svgElement, graphElement, type: 'plan' }
              setHasVis(true)
            }}
            setPlanExpand={(expand: PlanExpand) => setPlanExpand(expand)}
          />
        </Display>
        <Display if={openView === ViewTypes.VISUALIZATION} lazy>
          <VisualizationConnectedBus
            isFullscreen={isFullscreen}
            result={result}
            updated={request?.updated}
            assignVisElement={(
              svgElement: SVGElement,
              graphElement: GraphElement
            ) => {
              visElement.current = { svgElement, graphElement, type: 'graph' }
              setHasVis(true)
            }}
            initialNodeDisplay={initialNodeDisplay}
            autoComplete={autoComplete}
            maxNeighbours={maxNeighbours}
          />
        </Display>
      </StyledFrameBody>
    )
  }

  const getStatusbar = (result: BrowserRequestResult): JSX.Element => {
    return (
      <StyledStatsBarContainer>
        <Display if={openView === ViewTypes.TEXT} lazy>
          <AsciiStatusbar
            asciiMaxColWidth={asciiMaxColWidth}
            asciiSetColWidth={asciiSetColWidth}
            maxRows={maxRows}
            result={result}
            updated={request?.updated}
            setAsciiSetColWidth={setAsciiSetColWidthState}
          />
        </Display>
        <Display if={openView === ViewTypes.TABLE} lazy>
          <RelatableStatusbar updated={request?.updated} result={result} />
        </Display>
        <Display if={openView === ViewTypes.CODE} lazy>
          <CodeStatusbar result={result} />
        </Display>
        <Display if={openView === ViewTypes.ERRORS} lazy>
          <ErrorsStatusbar result={result} />
        </Display>
        <Display if={openView === ViewTypes.WARNINGS} lazy>
          <WarningsStatusbar result={result} updated={request?.updated} />
        </Display>
        <Display if={openView === ViewTypes.PLAN} lazy>
          <PlanStatusbar
            result={result}
            setPlanExpand={(expand: PlanExpand) => setPlanExpand(expand)}
          />
        </Display>
      </StyledStatsBarContainer>
    )
  }

  const { cmd: query = '' } = frame
  const { result = {} as BrowserRequestResult, status: requestStatus } =
    request || ({} as BrowserRequest)

  const frameContents =
    requestStatus === REQUEST_STATUS_PENDING ? (
      getSpinner()
    ) : isCancelStatus(requestStatus) ? (
      <CancelView requestStatus={requestStatus} />
    ) : (
      getFrameContents(request, result, query)
    )

  const statusBar =
    openView !== ViewTypes.VISUALIZATION && requestStatus !== 'error'
      ? getStatusbar(result)
      : null

  return (
    <FrameBodyTemplate
      isCollapsed={isCollapsed}
      isFullscreen={isFullscreen}
      sidebar={requestStatus !== 'error' ? sidebar : undefined}
      contents={frameContents}
      statusBar={statusBar}
      removePadding
    />
  )
}

// Custom comparison function for React.memo
// Returns true if props are equal (do NOT re-render)
function arePropsEqual(
  prevProps: CypherFrameProps,
  nextProps: CypherFrameProps
): boolean {
  return (
    prevProps.isCollapsed === nextProps.isCollapsed &&
    prevProps.isFullscreen === nextProps.isFullscreen &&
    prevProps.frame?.requestId === nextProps.frame?.requestId
  )
}

const CypherFrame = React.memo(CypherFrameComponent, arePropsEqual)

// Export the class for backwards compatibility in tests
export { CypherFrameComponent as CypherFrame }

export default CypherFrame
