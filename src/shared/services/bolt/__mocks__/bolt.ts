/*
 * Mock for bolt.ts to avoid import.meta.url issues in tests
 */
import { QueryResult } from 'neo4j-driver'

export const openConnection = jest.fn(() => Promise.resolve())
export const closeConnection = jest.fn(() => Promise.resolve())
export const directTransaction = jest.fn((): [string, Promise<QueryResult>] => [
  'mock-id',
  Promise.resolve({
    records: [],
    summary: {} as any
  })
])
export const routedReadTransaction = jest.fn(
  (): [string, Promise<QueryResult>] => [
    'mock-id',
    Promise.resolve({
      records: [],
      summary: {} as any
    })
  ]
)
export const routedWriteTransaction = jest.fn(
  (): [string, Promise<QueryResult>] => [
    'mock-id',
    Promise.resolve({
      records: [],
      summary: {} as any
    })
  ]
)
export const cancelTransaction = jest.fn()
export const directConnect = jest.fn(() => Promise.resolve({}))
export const ensureConnection = jest.fn(() => Promise.resolve())
export const getUserDb = jest.fn(() => null)
export const closeConnectionInPool = jest.fn()

// Mock for retrieveFormattedUpdateStatistics - returns empty string by default
export const retrieveFormattedUpdateStatistics = jest.fn(() => '')

// Mock for extractPlan - extracts plan/profile from result summary
export const extractPlan = jest.fn(
  (result: any, calculateTotalDbHits = false) => {
    if (!result || !result.summary) return null
    const { summary } = result
    const plan = summary.profile || summary.plan
    if (!plan) return null

    const { operatorType, arguments: args = {} } = plan
    return {
      root: {
        operatorType,
        version: args.version || 'CYPHER 4.0',
        planner: args.planner || 'COST',
        runtime: args.runtime || 'INTERPRETED',
        totalDbHits: calculateTotalDbHits ? plan.dbHits : undefined,
        children: plan.children || [],
        identifiers: plan.identifiers || [],
        ...plan
      }
    }
  }
)

// Default export matching the real bolt.ts structure
export default {
  openConnection,
  closeConnection,
  directTransaction,
  routedReadTransaction,
  routedWriteTransaction,
  cancelTransaction,
  directConnect,
  ensureConnection,
  getUserDb,
  closeConnectionInPool,
  retrieveFormattedUpdateStatistics,
  extractPlan,
  quickVerifyConnectivity: jest.fn(() => Promise.resolve()),
  hasMultiDbSupport: jest.fn(() => Promise.resolve(false)),
  useDb: jest.fn(),
  recordsToTableArray: jest.fn(() => []),
  extractNodesAndRelationshipsFromRecords: jest.fn(() => ({
    nodes: [],
    relationships: []
  })),
  extractNodesAndRelationshipsFromRecordsForOldVis: jest.fn(() => ({
    nodes: [],
    relationships: []
  })),
  itemIntToNumber: jest.fn((item: any) => item),
  addTypesAsField: jest.fn((result: any) => result),
  backgroundWorkerlessRoutedRead: jest.fn(() =>
    Promise.resolve({ records: [], summary: {} })
  )
}
