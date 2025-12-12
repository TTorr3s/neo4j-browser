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
import memoize from 'memoize-one'
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type JSX
} from 'react'

import {
  DoubleDownIcon,
  DoubleUpIcon
} from 'browser-components/icons/LegacyIcons'

import queryPlan from '../../D3Visualization/queryPlan/queryPlan'
import {
  StyledLeftPartial,
  StyledOneRowStatsBar,
  StyledRightPartial
} from '../styled'
import { PlanExpand } from './CypherFrame'
import { PlanSVG } from './PlanView.styled'
import Ellipsis from 'browser-components/Ellipsis'
import { FrameButton } from 'browser-components/buttons'
import { dim } from 'browser-styles/constants'
import { StyledFrameTitlebarButtonSection } from 'browser/modules/Frame/styled'
import bolt from 'services/bolt/bolt'
import { deepEquals } from 'neo4j-arc/common'

export type PlanViewProps = {
  planExpand: PlanExpand
  setPlanExpand: (p: PlanExpand) => void
  result: any
  updated: any
  assignVisElement: (a: any, b: any) => void
  isFullscreen: boolean
}

type ExtractedPlan = {
  root: {
    version?: string
    planner?: string
    runtime?: string
    totalDbHits?: number
    expanded?: boolean
    children?: any[]
  }
} | null

function PlanViewComponent(props: PlanViewProps): JSX.Element | null {
  const {
    planExpand,
    setPlanExpand,
    result,
    updated,
    assignVisElement,
    isFullscreen
  } = props

  const [extractedPlan, setExtractedPlan] = useState<ExtractedPlan>(null)
  const elRef = useRef<SVGSVGElement | null>(null)
  const planRef = useRef<any>(null)
  const prevUpdatedRef = useRef<any>(undefined)
  const prevPlanExpandRef = useRef<PlanExpand | undefined>(undefined)

  const toggleExpanded = useCallback(
    (expanded: boolean) => {
      if (!extractedPlan || !planRef.current) return

      const visit = (operator: any) => {
        operator.expanded = expanded
        if (operator.children) {
          operator.children.forEach((child: any) => {
            visit(child)
          })
        }
      }
      const tmpPlan = { ...extractedPlan }
      visit(tmpPlan.root)
      planRef.current.display(tmpPlan)
    },
    [extractedPlan]
  )

  const extractPlan = useCallback((resultData: any): Promise<ExtractedPlan> => {
    if (resultData === undefined) return Promise.reject(new Error('No result'))
    return new Promise(resolve => {
      const plan = bolt.extractPlan(resultData)
      if (plan) {
        setExtractedPlan(plan)
      }
      resolve(plan)
    })
  }, [])

  // Initial mount effect
  useEffect(() => {
    extractPlan(result)
      .then(() => {
        setPlanExpand('EXPAND')
      })
      .catch(() => {})
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle updated prop changes
  useEffect(() => {
    if (
      prevUpdatedRef.current !== undefined &&
      prevUpdatedRef.current !== updated
    ) {
      extractPlan(result || {}).catch(e => {
        console.log(e)
      })
    }
    prevUpdatedRef.current = updated
  }, [updated, result, extractPlan])

  // Handle planExpand changes
  useEffect(() => {
    if (
      planExpand &&
      prevPlanExpandRef.current !== undefined &&
      planExpand !== prevPlanExpandRef.current
    ) {
      switch (planExpand) {
        case 'COLLAPSE': {
          toggleExpanded(false)
          break
        }
        case 'EXPAND': {
          toggleExpanded(true)
          break
        }
      }
    }
    prevPlanExpandRef.current = planExpand
  }, [planExpand, toggleExpanded])

  // Handle assignVisElement updates
  useEffect(() => {
    if (assignVisElement && elRef.current && planRef.current) {
      assignVisElement(elRef.current, planRef.current)
    }
  }, [assignVisElement, extractedPlan])

  // Initialize plan when ref is set and extractedPlan is available
  const planInit = useCallback(
    (el: SVGSVGElement | null) => {
      if (el != null && !planRef.current && extractedPlan) {
        const NeoConstructor: any = queryPlan
        elRef.current = el
        planRef.current = new NeoConstructor(el)
        planRef.current.display(extractedPlan)
        planRef.current.boundingBox = () => {
          return el.getBBox()
        }

        if (assignVisElement) {
          assignVisElement(el, planRef.current)
        }

        // Trigger initial expand after plan is initialized
        toggleExpanded(true)
      }
    },
    [extractedPlan, assignVisElement, toggleExpanded]
  )

  if (!extractedPlan) return null

  return (
    <PlanSVG
      data-testid="planSvg"
      style={
        isFullscreen
          ? // @ts-expect-error ts-migrate(2769) FIXME: Object literal may only specify known properties, ... Remove this comment to see the full error message
            { 'padding-bottom': dim.frameStatusbarHeight + 'px' }
          : {}
      }
      ref={planInit}
    />
  )
}

// Custom comparison function for React.memo (inverse of shouldComponentUpdate)
function arePropsEqual(
  prevProps: PlanViewProps,
  nextProps: PlanViewProps
): boolean {
  if (prevProps.result === undefined) return false
  return (
    nextProps.isFullscreen === prevProps.isFullscreen &&
    deepEquals(nextProps.result?.summary, prevProps.result?.summary) &&
    nextProps.planExpand === prevProps.planExpand
  )
}

export const PlanView = React.memo(PlanViewComponent, arePropsEqual)

type PlanStatusbarProps = {
  result: any
  setPlanExpand: (p: PlanExpand) => void
}

const extractMemoizedPlan = memoize(
  result => bolt.extractPlan(result, true),
  (newArgs: any[], lastArgs: any[]) =>
    deepEquals(newArgs[0]?.summary, lastArgs[0]?.summary)
)

export function PlanStatusbar(props: PlanStatusbarProps) {
  const { result } = props
  if (!result || !result.summary) return null

  const plan = extractMemoizedPlan(result)
  if (!plan) return null

  return (
    <StyledOneRowStatsBar>
      <StyledLeftPartial>
        <Ellipsis>
          Cypher version: {plan.root.version}, planner: {plan.root.planner},
          runtime: {plan.root.runtime}.
          {plan.root.totalDbHits
            ? ` ${plan.root.totalDbHits} total db hits in ${
                result.summary.resultAvailableAfter
                  .add(result.summary.resultConsumedAfter)
                  .toNumber() || 0
              } ms.`
            : ''}
        </Ellipsis>
      </StyledLeftPartial>
      <StyledRightPartial>
        <StyledFrameTitlebarButtonSection>
          <FrameButton
            title="Collapse Plan"
            dataTestId="planCollapseButton"
            onClick={() => props.setPlanExpand('COLLAPSE')}
          >
            <DoubleUpIcon />
          </FrameButton>
          <FrameButton
            dataTestId="planExpandButton"
            title="Expand Plan"
            onClick={() => props.setPlanExpand('EXPAND')}
          >
            <DoubleDownIcon />
          </FrameButton>
        </StyledFrameTitlebarButtonSection>
      </StyledRightPartial>
    </StyledOneRowStatsBar>
  )
}
