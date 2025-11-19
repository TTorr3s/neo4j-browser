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
