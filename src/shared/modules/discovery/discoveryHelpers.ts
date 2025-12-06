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
import { pick } from 'lodash'

import { getDiscoveryEndpoint } from 'services/bolt/boltHelpers'
import { boltToHttp, boltUrlsHaveSameHost } from 'services/boltscheme.utils'
import {
  Connection,
  DiscoverableData
} from 'shared/modules/connections/connectionsDuck'
import { NEO4J_CLOUD_DOMAINS } from 'shared/modules/settings/settingsDuck'
import { parseURLWithDefaultProtocol, isCloudHost } from 'shared/services/utils'

const FetchError = 'FetchError'
const Success = 'Success'

type DiscoveryResult = {
  status: typeof FetchError | typeof Success
  host?: string
  neo4jVersion?: string
  neo4jEdition?: string
  message?: string
}

async function fetchDiscoveryDataFromUrl(
  url: string
): Promise<DiscoveryResult & { otherDataDiscovered: Record<string, unknown> }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      return {
        status: FetchError,
        message: `HTTP error: ${response.status}`,
        otherDataDiscovered: {}
      }
    }
    const data = await response.json()
    return { status: Success, otherDataDiscovered: data }
  } catch (e) {
    return {
      status: FetchError,
      message: e instanceof Error ? e.message : 'Unknown error',
      otherDataDiscovered: {}
    }
  }
}

export async function fetchBrowserDiscoveryDataFromUrl(
  url: string
): Promise<DiscoveryResult> {
  const res = await fetchDiscoveryDataFromUrl(url)
  const { otherDataDiscovered } = res

  if (res.status === FetchError) {
    return res
  }

  const strOrUndefined = (val: unknown) =>
    typeof val === 'string' ? val : undefined

  const host = strOrUndefined(
    otherDataDiscovered.bolt_routing ||
      otherDataDiscovered.bolt_direct ||
      otherDataDiscovered.bolt
  )
  const neo4jVersion = strOrUndefined(otherDataDiscovered.neo4j_version)
  const neo4jEdition = strOrUndefined(otherDataDiscovered.neo4j_edition)

  return {
    ...res,
    host,
    ...(host ? { host } : {}),
    ...(neo4jEdition ? { neo4jEdition } : {}),
    ...(neo4jVersion ? { neo4jVersion } : {})
  }
}

type DataFromPreviousAction = {
  forceUrl: string
  discoveryUrl: string
  requestedUseDb?: string
  encrypted?: boolean
  restApi?: string
  discoveryConnection?: Connection
}

type GetAndMergeDiscoveryDataParams = {
  action: DataFromPreviousAction
  hostedUrl: string
  hasDiscoveryEndpoint: boolean
  generateBoltUrlWithAllowedScheme: (boltUrl: string) => string
}
type TaggedDiscoveryData = DiscoverableData & {
  source: DiscoveryDataSource
  urlMissing: boolean
  host: string
  onlyCheckForHost?: boolean
  status?: string
}

type DiscoveryDataSource =
  | 'connectForm'
  | 'discoveryUrl'
  | 'connectUrl'
  | 'discoveryConnection'
  | 'discoveryEndpoint'
export const CONNECT_FORM = 'connectForm'
export const DISCOVERY_URL = 'discoveryURL'
export const CONNECT_URL = 'connectURL'
export const DISCOVERY_CONNECTION = 'discoveryConnection'
export const DISCOVERY_ENDPOINT = 'discoveryEndpoint'

const onlyTruthyValues = (obj: any) =>
  Object.entries(obj)
    .filter(item => item[1] /* truthy check on value */)
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})

export async function getAndMergeDiscoveryData({
  action,
  hostedUrl,
  hasDiscoveryEndpoint,
  generateBoltUrlWithAllowedScheme
}: GetAndMergeDiscoveryDataParams): Promise<DiscoverableData | null> {
  const { forceUrl, discoveryConnection } = action

  let dataFromForceUrl: DiscoverableData = {}
  let dataFromConnection: DiscoverableData = {}

  const forceUrlData = forceUrl ? parseURLWithDefaultProtocol(forceUrl) : null
  if (forceUrlData) {
    const { username, protocol, host } = forceUrlData

    const discovered = {
      username,
      requestedUseDb: action.requestedUseDb,
      host: `${protocol ? `${protocol}//` : ''}${host}`,
      supportsMultiDb: !!action.requestedUseDb,
      encrypted: action.encrypted,
      restApi: action.restApi,
      hasForceUrl: true
    }

    dataFromForceUrl = onlyTruthyValues(discovered)
  } else if (discoveryConnection) {
    const discovered = {
      username: discoveryConnection.username,
      requestedUseDb: discoveryConnection.db,
      host: discoveryConnection.host,
      supportsMultiDb: !!discoveryConnection.db
    }

    dataFromConnection = onlyTruthyValues(discovered)
  }

  const forceUrlHostPromise = dataFromForceUrl.host
    ? fetchBrowserDiscoveryDataFromUrl(
        boltToHttp(generateBoltUrlWithAllowedScheme(dataFromForceUrl.host))
      )
    : Promise.resolve(null)

  const discoveryConnectionHostPromise = dataFromConnection.host
    ? fetchBrowserDiscoveryDataFromUrl(
        boltToHttp(generateBoltUrlWithAllowedScheme(dataFromConnection.host))
      )
    : Promise.resolve(null)

  const discoveryUrlParamPromise = action.discoveryUrl
    ? fetchBrowserDiscoveryDataFromUrl(action.discoveryUrl)
    : Promise.resolve(null)

  const discoveryEndpointPromise = hasDiscoveryEndpoint
    ? fetchBrowserDiscoveryDataFromUrl(getDiscoveryEndpoint(hostedUrl))
    : Promise.resolve(null)

  // Promise all is safe since fetchDataFromDiscoveryUrl never rejects
  const [
    forceUrlHostData,
    discoveryUrlParamData,
    discoveryConnectionHostData,
    discoveryEndpointData
  ] = await Promise.all([
    forceUrlHostPromise,
    discoveryUrlParamPromise,
    discoveryConnectionHostPromise,
    discoveryEndpointPromise
  ])

  // Ordered by importance, top-most data takes precedence
  const normalisedDiscoveryData = (
    [
      {
        source: CONNECT_URL as DiscoveryDataSource,
        // The "dataFromForceURL" we want to keep regardless if there was a network request or not.
        // if we're dealing with a pre 4.4 server the disc request will fail even as there's a db present
        onlyCheckForHost: true,
        urlMissing: forceUrlHostData === null,
        ...dataFromForceUrl,
        ...forceUrlHostData,
        host: forceUrlHostData?.host || dataFromForceUrl.host
      },
      {
        source: DISCOVERY_URL as DiscoveryDataSource,
        urlMissing: discoveryUrlParamData === null,
        ...discoveryUrlParamData,
        host: discoveryUrlParamData?.host
      },
      {
        source: DISCOVERY_CONNECTION as DiscoveryDataSource,
        urlMissing: discoveryConnectionHostData === null,
        ...discoveryConnectionHostData,
        host: discoveryConnectionHostData?.host || discoveryConnection?.host
      },
      {
        source: DISCOVERY_ENDPOINT as DiscoveryDataSource,
        urlMissing: discoveryEndpointData === null,
        ...discoveryEndpointData,
        host: discoveryEndpointData?.host
      }
    ] as Array<Partial<TaggedDiscoveryData>>
  ).filter((entry): entry is TaggedDiscoveryData => {
    if ('onlyCheckForHost' in entry && !entry.onlyCheckForHost) {
      if (entry.urlMissing || !('status' in entry)) {
        return false
      }

      if (entry.status === FetchError) {
        return false
      }
    }

    if (!('host' in entry) || !entry.host) {
      return false
    }
    return true
  })

  if (normalisedDiscoveryData.length === 0) {
    return null
  }

  const [mainDiscoveryData, ...otherDiscoveryData] = normalisedDiscoveryData

  const keysToCopy: (keyof DiscoverableData)[] = [
    'username',
    'password',
    'requestedUseDb',
    'restApi',
    'supportsMultiDb',
    'host',
    'encrypted',
    'neo4jVersion',
    'hasForceUrl'
  ]

  let mergedDiscoveryData = pick(mainDiscoveryData, keysToCopy)
  if (otherDiscoveryData.length > 1) {
    const otherDiscoveryDataWithMatchingHost = otherDiscoveryData.filter(
      ({ host }) => {
        if (boltUrlsHaveSameHost(mainDiscoveryData.host, host)) {
          return true
        } else {
          return false
        }
      }
    )

    otherDiscoveryDataWithMatchingHost.forEach(data => {
      mergedDiscoveryData = {
        ...pick(data, keysToCopy),
        ...mergedDiscoveryData
      }
    })
  }

  const isAura = isCloudHost(mergedDiscoveryData.host, NEO4J_CLOUD_DOMAINS)
  mergedDiscoveryData.supportsMultiDb =
    !!action.requestedUseDb ||
    (!isAura &&
      parseInt((mergedDiscoveryData.neo4jVersion || '0').charAt(0)) >= 4)

  mergedDiscoveryData.host = generateBoltUrlWithAllowedScheme(
    mergedDiscoveryData.host
  )

  return mergedDiscoveryData
}
