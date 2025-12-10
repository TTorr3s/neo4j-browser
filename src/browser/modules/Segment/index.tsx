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
import React, { useEffect, memo } from 'react'
import { connect } from 'react-redux'

import { canUseDOM } from 'services/utils'
import { inDesktop } from 'shared/modules/app/appDuck'
import {
  getAuraNtId,
  getDesktopTrackingId,
  updateUdcData
} from 'shared/modules/udc/udcDuck'

export interface MetricsProperties {
  [key: string]: string | number | Date | boolean
}

export interface MetricsData {
  category: string
  label: string
  data: MetricsProperties
}

interface SegmentOwnProps {
  segmentKey: string
  setTrackCallback: (callback: ((data: MetricsData) => void) | null) => void
  [key: string]: unknown
}

interface SegmentStateProps {
  inDesktop: boolean
  auraNtId: string | undefined
  desktopTrackingId: string | undefined
}

interface SegmentDispatchProps {
  updateData: (data: Record<string, unknown>) => void
}

type SegmentProps = SegmentOwnProps & SegmentStateProps & SegmentDispatchProps

const SegmentComponent: React.FC<SegmentProps> = ({
  segmentKey,
  setTrackCallback,
  inDesktop,
  updateData,
  auraNtId,
  desktopTrackingId,
  children: _children, // eslint-disable-line
  ...otherProps
}) => {
  // componentDidMount equivalent
  useEffect(() => {
    if (!segmentKey || !canUseDOM()) {
      return
    }

    if (!(window as any).analytics) {
      ;(function (
        window: any,
        document: Document,
        segmentKey: string,
        a?: any
      ) {
        const analytics = (window.analytics = window.analytics || [])
        if (!analytics.initialize) {
          if (analytics.invoked) {
            window.console &&
              console.error &&
              console.error('Segment snippet included twice.')
          } else {
            analytics.invoked = !0
            analytics.methods = [
              'trackSubmit',
              'trackClick',
              'trackLink',
              'trackForm',
              'pageview',
              'identify',
              'reset',
              'group',
              'track',
              'ready',
              'alias',
              'debug',
              'page',
              'once',
              'off',
              'on',
              'addSourceMiddleware',
              'addIntegrationMiddleware',
              'setAnonymousId',
              'addDestinationMiddleware'
            ]
            analytics.factory = function (t: any) {
              return function () {
                const e = Array.prototype.slice.call(arguments)
                e.unshift(t)
                analytics.push(e)
                return analytics
              }
            }
            for (let t = 0; t < analytics.methods.length; t++) {
              const e = analytics.methods[t]
              analytics[e] = analytics.factory(e)
            }
            analytics.load = function (t: any, e: any) {
              const n = document.createElement('script')
              n.type = 'text/javascript'
              n.async = !0
              n.src =
                'https://cdn.segment.com/analytics.js/v1/' +
                t +
                '/analytics.min.js'
              a = document.getElementsByTagName('script')[0]
              a.parentNode.insertBefore(n, a)
              analytics._loadOptions = e
            }
            analytics._writeKey = segmentKey
            analytics.SNIPPET_VERSION = '4.13.2'
            analytics.load(segmentKey)
            const doTrack = (metricsData: MetricsData) => {
              const { category, label, data } = metricsData
              window.analytics.track(category + '-' + label, {
                ...data,
                desktop: inDesktop
              })
            }

            if (auraNtId) {
              window.analytics.identify(auraNtId)
            } else if (inDesktop && desktopTrackingId) {
              window.analytics.identify(desktopTrackingId)
            }

            setTrackCallback(doTrack)
          }
        }
      })(window, document, segmentKey)
    }
    updateData({ ...otherProps, segmentKey: segmentKey })

    // componentWillUnmount equivalent
    return () => {
      setTrackCallback(null)
      if (canUseDOM()) {
        delete (window as any).analytics
      }
    }
    // Empty dependency array: runs only on mount/unmount
    // This replicates the original behavior where shouldComponentUpdate always returned false,
    // meaning componentDidUpdate was never called after the initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

// React.memo with custom comparison that always returns true
// replicates shouldComponentUpdate always returning false
// (never re-render due to prop changes)
export const Segment = memo(SegmentComponent, () => true)

const mapStateToProps = (state: any): SegmentStateProps => ({
  inDesktop: inDesktop(state),
  auraNtId: getAuraNtId(state),
  desktopTrackingId: getDesktopTrackingId(state)
})

const mapDispatchToProps = (dispatch: any): SegmentDispatchProps => {
  return {
    updateData: (data: Record<string, unknown>) => dispatch(updateUdcData(data))
  }
}

export default connect<
  SegmentStateProps,
  SegmentDispatchProps,
  SegmentOwnProps
>(
  mapStateToProps,
  mapDispatchToProps
)(Segment)
