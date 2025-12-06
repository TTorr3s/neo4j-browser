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
import { getAndMergeDiscoveryData } from './discoveryHelpers'

const fakeDiscoveryResponse = ({
  host,
  neo4jVersion = '4.4.0',
  neo4jEdition = 'enterprise'
}: {
  host?: string
  neo4jVersion?: string
  neo4jEdition?: string
}): Record<string, unknown> => ({
  ...(host
    ? {
        bolt_routing: host,
        bolt_direct: host,
        neo4j_version: neo4jVersion,
        neo4j_edition: neo4jEdition
      }
    : {})
})

const baseAction = {
  encrypted: false,
  requestedUseDb: '',
  restApi: '',
  forceUrl: '',
  discoveryUrl: ''
}
const hostedUrl = 'http://hostedURL.com'
const forceUrl = 'http://forceURL.com'
const discoveryUrl = 'http://discoveryURL.com'
const generateBoltUrlWithAllowedScheme = (s: string) => s

describe('getAndMergeDiscoveryData', () => {
  beforeEach(() => {
    fetchMock.resetMocks()
  })

  test('finds host when only discovery endpoint is set up', async () => {
    const boltHost = 'neo4j://localhost:7687'
    const browserHost = 'http://localhost:7474'
    const neo4jVersion = '4.4.1'

    fetchMock.mockResponseOnce(
      JSON.stringify(fakeDiscoveryResponse({ host: boltHost, neo4jVersion }))
    )

    // When
    const discoveryData = await getAndMergeDiscoveryData({
      action: baseAction,
      hostedUrl: browserHost,
      generateBoltUrlWithAllowedScheme,
      hasDiscoveryEndpoint: true
    })
    expect(discoveryData).toBeTruthy()
    expect(discoveryData?.host).toEqual(boltHost)
    expect(discoveryData?.neo4jVersion).toEqual(neo4jVersion)
  })

  test('finds host when only discovery endpoint (pre 4.4) is set up', async () => {
    const boltHost = 'neo4j://localhost:7687'
    const browserHost = 'http://localhost:7474'
    const neo4jVersion = '4.3.1'

    fetchMock.mockResponseOnce(
      JSON.stringify({
        bolt_routing: boltHost,
        bolt_direct: boltHost,
        neo4j_version: neo4jVersion,
        neo4j_edition: 'enterprise'
      })
    )

    // When
    const discoveryData = await getAndMergeDiscoveryData({
      action: baseAction,
      hostedUrl: browserHost,
      generateBoltUrlWithAllowedScheme,
      hasDiscoveryEndpoint: true
    })
    expect(discoveryData).toBeTruthy()
    expect(discoveryData?.host).toEqual(boltHost)
    expect(discoveryData?.neo4jVersion).toEqual(neo4jVersion)
  })

  test('prioritises forceUrl over discovery endpoint', async () => {
    // Given - mock responses in order they will be called
    fetchMock.mockResponses(
      // forceUrl response
      [
        JSON.stringify(fakeDiscoveryResponse({ host: 'bolthost' })),
        { status: 200 }
      ],
      // discoveryUrl response
      [
        JSON.stringify(fakeDiscoveryResponse({ host: 'otherhost' })),
        { status: 200 }
      ],
      // hostedUrl response
      [
        JSON.stringify(fakeDiscoveryResponse({ host: 'otherhost' })),
        { status: 200 }
      ]
    )

    const action = {
      ...baseAction,
      discoveryUrl: discoveryUrl,
      forceUrl: forceUrl
    }

    // When
    const discoveryData = await getAndMergeDiscoveryData({
      action,
      hostedUrl: hostedUrl,
      generateBoltUrlWithAllowedScheme,
      hasDiscoveryEndpoint: true
    })

    // Then
    expect(discoveryData).toBeTruthy()
    expect(discoveryData?.host).toEqual('bolthost')
  })

  test('merges discovery data when hosts are identical', async () => {
    // Given
    const hasDiscoveryEndpoint = true

    fetchMock.mockResponses(
      // forceUrl
      [
        JSON.stringify(fakeDiscoveryResponse({ host: 'bolthost' })),
        { status: 200 }
      ],
      // discoveryUrl
      [
        JSON.stringify(fakeDiscoveryResponse({ host: 'bolthost' })),
        { status: 200 }
      ],
      // hostedUrl
      [
        JSON.stringify(fakeDiscoveryResponse({ host: 'bolthost' })),
        { status: 200 }
      ]
    )

    const action = {
      ...baseAction,
      discoveryUrl: discoveryUrl,
      forceUrl: forceUrl
    }

    // When
    const discoveryData = await getAndMergeDiscoveryData({
      action,
      hostedUrl: hostedUrl,
      generateBoltUrlWithAllowedScheme,
      hasDiscoveryEndpoint
    })

    // Then
    expect(discoveryData).toBeTruthy()
    expect(discoveryData?.host).toEqual('bolthost')
  })

  test('returns null when no discovery data is found', async () => {
    fetchMock.mockResponseOnce('', { status: 500 })

    const discoveryData = await getAndMergeDiscoveryData({
      action: baseAction,
      hostedUrl: hostedUrl,
      generateBoltUrlWithAllowedScheme,
      hasDiscoveryEndpoint: false
    })

    expect(discoveryData).toBeNull()
  })
})
