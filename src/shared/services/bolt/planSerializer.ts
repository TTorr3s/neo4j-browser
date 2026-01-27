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

/**
 * JSON schema for exported query plan operators (v1.1)
 */
export interface PlanOperatorJson {
  operatorType: string
  depth: number
  identifiers: string[]

  // Performance metrics
  dbHits: number
  rows: number
  estimatedRows?: number
  estimationAccuracy?: number

  // Relative cost
  costPercentage: number
  cumulativeCost: number

  // Cache (optional)
  pageCacheHits?: number
  pageCacheMisses?: number
  pageCacheHitRatio?: number

  // Details parsed
  details?: string
  expression?: string
  index?: string
  order?: string
  keyNames?: string

  // Memory metrics (optional)
  memory?: number
  globalMemory?: number

  children: PlanOperatorJson[]
}

/**
 * Top cost operator summary for analysis
 */
export interface TopCostOperator {
  operatorType: string
  depth: number
  dbHits: number
  costPercentage: number
  details?: string
}

/**
 * Estimation issue for analysis
 */
export interface EstimationIssue {
  operatorType: string
  depth: number
  estimatedRows: number
  actualRows: number
  accuracy: number
}

/**
 * Analysis section for quick LLM understanding
 */
export interface PlanAnalysis {
  operatorCount: number
  operatorsByType: Record<string, number>
  topCostOperators: TopCostOperator[]
  estimationIssues: EstimationIssue[]
}

/**
 * Starting point information
 */
export interface StartingPointInfo {
  label: string
  operator: string
  rows: number
  dbHits: number
  usesIndex: boolean
  indexDetails?: string
}

/**
 * Filter not using an index
 */
export interface FilterWithoutIndex {
  property: string
  label: string
  filterDetails: string
  dbHits: number
  depth: number
}

/**
 * Warning severity levels
 */
export type WarningSeverity = 'low' | 'medium' | 'high'

/**
 * Warning types for objectively problematic patterns
 */
export type WarningType = 'CARTESIAN_PRODUCT' | 'EAGER_OPERATOR'

/**
 * Plan warning for problematic patterns
 */
export interface PlanWarning {
  type: WarningType
  depth: number
  operatorType: string
  description: string
  severity: WarningSeverity
}

/**
 * Insights section - objective facts only, no suggestions
 */
export interface PlanInsights {
  startingPoint: StartingPointInfo
  filtersWithoutIndex: FilterWithoutIndex[]
  warnings: PlanWarning[]
}

/**
 * JSON schema for exported query plan (v1.3)
 */
export interface QueryPlanJson {
  schemaVersion: '1.3'
  exportedAt: string
  query?: string
  metadata: {
    cypherVersion?: string
    planner?: string
    runtime?: string
    totalDbHits: number
    totalRows: number
    planDepth: number
  }
  analysis: PlanAnalysis
  insights: PlanInsights
  plan: PlanOperatorJson
}

/**
 * Removes @graph.db suffix from operator types
 */
function cleanOperatorType(opType: string): string {
  return opType.replace(/@[\w.]+$/, '')
}

/**
 * Filters out anonymous identifiers (anon_X) that don't add semantic value
 */
function filterIdentifiers(identifiers: string[]): string[] {
  return identifiers.filter(
    id => !id.startsWith('anon_') && !id.startsWith('  ')
  )
}

/**
 * Calculates page cache hit ratio
 */
function calculateCacheHitRatio(
  hits?: number,
  misses?: number
): number | undefined {
  if (hits === undefined || misses === undefined) return undefined
  const total = hits + misses
  return total > 0 ? hits / total : undefined
}

/**
 * Extracts numeric value from Neo4j Int64 representation
 * Neo4j may return large integers as { low: number, high: number } objects
 */
function extractNumericValue(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'object' && 'low' in value && 'high' in value) {
    const obj = value as { low: number; high: number }
    // Reconstruct 64-bit integer (simplified - may lose precision for very large values)
    return obj.high * 0x100000000 + (obj.low >>> 0)
  }
  return undefined
}

/**
 * Internal operator data collected during tree traversal
 */
interface OperatorData {
  operatorType: string
  depth: number
  dbHits: number
  rows: number
  estimatedRows?: number
  details?: string
  expression?: string
  childrenCount: number
  inputRows: number // rows from child operators
}

/**
 * Context passed during serialization for cost calculations
 */
interface SerializationContext {
  totalDbHits: number
  cumulativeDbHits: number
}

/**
 * Converts internal plan operator to JSON-serializable format
 */
function serializeOperator(
  operator: any,
  depth: number,
  context: SerializationContext
): PlanOperatorJson {
  const rawOperatorType = operator.operatorType || 'Unknown'
  const operatorType = cleanOperatorType(rawOperatorType)
  const identifiers = filterIdentifiers(operator.identifiers || [])

  // Extract numeric metrics
  const dbHits = operator.DbHits ?? operator.dbHits ?? 0
  const rows = operator.Rows ?? operator.rows ?? 0
  const estimatedRows = operator.EstimatedRows ?? operator.estimatedRows
  const pageCacheHits = operator.PageCacheHits ?? operator.pageCacheHits
  const pageCacheMisses = operator.PageCacheMisses ?? operator.pageCacheMisses
  const memoryRaw = operator.Memory ?? operator.memory
  const globalMemoryRaw = operator.GlobalMemory ?? operator.globalMemory
  // Neo4j may return Int64 as { low, high } object - extract numeric value
  const memory = extractNumericValue(memoryRaw)
  const globalMemory = extractNumericValue(globalMemoryRaw)

  // Calculate derived metrics
  const costPercentage =
    context.totalDbHits > 0 ? (dbHits / context.totalDbHits) * 100 : 0
  context.cumulativeDbHits += dbHits
  const cumulativeCost = context.cumulativeDbHits

  const estimationAccuracy =
    estimatedRows !== undefined && estimatedRows > 0 && rows !== undefined
      ? rows / estimatedRows
      : undefined

  const pageCacheHitRatio = calculateCacheHitRatio(
    pageCacheHits,
    pageCacheMisses
  )

  const result: PlanOperatorJson = {
    operatorType,
    depth,
    identifiers,
    dbHits,
    rows,
    costPercentage: Math.round(costPercentage * 100) / 100,
    cumulativeCost,
    children: []
  }

  // Add optional numeric metrics
  if (estimatedRows !== undefined) {
    result.estimatedRows = estimatedRows
  }
  if (estimationAccuracy !== undefined) {
    result.estimationAccuracy = Math.round(estimationAccuracy * 100) / 100
  }
  if (pageCacheHits !== undefined) {
    result.pageCacheHits = pageCacheHits
  }
  if (pageCacheMisses !== undefined) {
    result.pageCacheMisses = pageCacheMisses
  }
  if (pageCacheHitRatio !== undefined) {
    result.pageCacheHitRatio = Math.round(pageCacheHitRatio * 100) / 100
  }
  if (memory !== undefined) {
    result.memory = memory
  }
  if (globalMemory !== undefined) {
    result.globalMemory = globalMemory
  }

  // Add string properties (use capitalized versions only to avoid D3 visual properties)
  const details = operator.Details ?? operator.details
  const expression = operator.Expression ?? operator.expression
  const planIndex = operator.Index // Only capitalized - lowercase 'index' is D3 visual property
  const order = operator.Order ?? operator.order
  const keyNames = operator.KeyNames ?? operator.keyNames

  if (details !== undefined) {
    result.details = details
  }
  if (expression !== undefined) {
    result.expression = expression
  }
  if (planIndex !== undefined) {
    result.index = planIndex
  }
  if (order !== undefined) {
    result.order = order
  }
  if (keyNames !== undefined) {
    result.keyNames = keyNames
  }

  // Recursively process children
  if (Array.isArray(operator.children)) {
    result.children = operator.children.map((child: any) =>
      serializeOperator(child, depth + 1, context)
    )
  }

  return result
}

/**
 * Calculates the total dbHits for the entire plan tree
 */
function calculateTotalDbHits(operator: any): number {
  const dbHits = operator.DbHits ?? operator.dbHits ?? 0
  const childrenDbHits = (operator.children || []).reduce(
    (sum: number, child: any) => sum + calculateTotalDbHits(child),
    0
  )
  return dbHits + childrenDbHits
}

/**
 * Calculates total rows at the root
 */
function calculateTotalRows(operator: any): number {
  return operator.Rows ?? operator.rows ?? 0
}

/**
 * Calculates the maximum depth of the plan tree
 */
function calculatePlanDepth(operator: any, currentDepth = 0): number {
  if (!operator.children || operator.children.length === 0) {
    return currentDepth
  }
  return Math.max(
    ...operator.children.map((child: any) =>
      calculatePlanDepth(child, currentDepth + 1)
    )
  )
}

/**
 * Collects all operators from the tree for analysis
 */
function collectOperators(operator: any, depth = 0): OperatorData[] {
  const dbHits = operator.DbHits ?? operator.dbHits ?? 0
  const rows = operator.Rows ?? operator.rows ?? 0
  const estimatedRows = operator.EstimatedRows ?? operator.estimatedRows
  const details = operator.Details ?? operator.details
  const expression = operator.Expression ?? operator.expression
  const children = operator.children || []

  // Calculate input rows from children
  const inputRows = children.reduce(
    (sum: number, child: any) => sum + (child.Rows ?? child.rows ?? 0),
    0
  )

  const current: OperatorData = {
    operatorType: cleanOperatorType(operator.operatorType || 'Unknown'),
    depth,
    dbHits,
    rows,
    estimatedRows,
    details,
    expression,
    childrenCount: children.length,
    inputRows: inputRows || rows // If no children, input = output
  }

  const childOperators = children.flatMap((child: any) =>
    collectOperators(child, depth + 1)
  )

  return [current, ...childOperators]
}

/**
 * Generates the analysis section for quick LLM understanding
 */
function generateAnalysis(root: any, totalDbHits: number): PlanAnalysis {
  const operators = collectOperators(root)

  // Count operators by type
  const operatorsByType = operators.reduce(
    (acc, op) => {
      acc[op.operatorType] = (acc[op.operatorType] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // Top 5 most costly operators
  const topCostOperators: TopCostOperator[] = operators
    .sort((a, b) => b.dbHits - a.dbHits)
    .slice(0, 5)
    .map(op => ({
      operatorType: op.operatorType,
      depth: op.depth,
      dbHits: op.dbHits,
      costPercentage:
        totalDbHits > 0
          ? Math.round((op.dbHits / totalDbHits) * 100 * 100) / 100
          : 0,
      ...(op.details ? { details: op.details } : {})
    }))

  // Estimation issues (accuracy < 0.5 or > 2.0)
  const estimationIssues: EstimationIssue[] = operators
    .filter(op => {
      if (op.estimatedRows === undefined || op.rows === undefined) return false
      if (op.estimatedRows === 0) return op.rows > 0
      const accuracy = op.rows / op.estimatedRows
      return accuracy < 0.5 || accuracy > 2.0
    })
    .map(op => ({
      operatorType: op.operatorType,
      depth: op.depth,
      estimatedRows: op.estimatedRows!,
      actualRows: op.rows,
      accuracy:
        op.estimatedRows === 0
          ? Infinity
          : Math.round((op.rows / op.estimatedRows!) * 100) / 100
    }))

  return {
    operatorCount: operators.length,
    operatorsByType,
    topCostOperators,
    estimationIssues
  }
}

// ============================================================================
// INSIGHTS GENERATION - Objective facts only, no suggestions
// ============================================================================

/**
 * Parses filter details to extract property and label information
 */
function parseFilterDetails(details: string): {
  properties: string[]
  labels: string[]
} {
  const properties: string[] = []
  const labels: string[] = []

  // Extract properties: var.property patterns (including cache[var.property])
  const propertyMatches = details.matchAll(/(?:cache\[)?(\w+)\.(\w+)\]?/g)
  for (const match of propertyMatches) {
    properties.push(`${match[1]}.${match[2]}`)
  }

  // Extract labels: var:Label patterns
  const labelMatches = details.matchAll(/(\w+):(\w+)/g)
  for (const match of labelMatches) {
    labels.push(match[2])
  }

  return { properties, labels }
}

/**
 * Extracts label from operator details
 */
function extractLabelFromDetails(details?: string): string | null {
  if (!details) return null

  // Try to match "var:Label" pattern (handles INDEX var:Label(prop) too)
  const varLabelMatch = details.match(/\w+:(\w+)/)?.[1]
  if (varLabelMatch) return varLabelMatch

  // Try to match ":Label" pattern
  const labelOnlyMatch = details.match(/:(\w+)/)?.[1]
  if (labelOnlyMatch) return labelOnlyMatch

  return null
}

/**
 * Infers a label name from a variable name using common patterns
 */
function inferLabelFromVariable(varName: string): string {
  const patterns: Record<string, string> = {
    u: 'User',
    n: 'Node',
    m: 'Node',
    p: 'Person',
    c: 'Company',
    tx: 'Transaction'
  }
  return (
    patterns[varName.toLowerCase()] ||
    varName.charAt(0).toUpperCase() + varName.slice(1)
  )
}

/**
 * Finds the starting point of the query plan
 */
function findStartingPoint(operators: OperatorData[]): StartingPointInfo {
  const scanOps = operators.filter(
    op =>
      op.operatorType === 'NodeByLabelScan' ||
      op.operatorType === 'NodeIndexSeek' ||
      op.operatorType === 'NodeUniqueIndexSeek' ||
      op.operatorType === 'NodeIndexScan'
  )

  if (scanOps.length === 0) {
    return {
      label: 'Unknown',
      operator: 'Unknown',
      rows: 0,
      dbHits: 0,
      usesIndex: false
    }
  }

  // Starting point is the one at maximum depth (executed first in Neo4j plans)
  const startOp = scanOps.reduce((max, op) => (op.depth > max.depth ? op : max))
  const usesIndex =
    startOp.operatorType === 'NodeIndexSeek' ||
    startOp.operatorType === 'NodeUniqueIndexSeek' ||
    startOp.operatorType === 'NodeIndexScan'

  const result: StartingPointInfo = {
    label: extractLabelFromDetails(startOp.details) || 'Unknown',
    operator: startOp.operatorType,
    rows: startOp.rows,
    dbHits: startOp.dbHits,
    usesIndex
  }

  if (usesIndex && startOp.details) {
    result.indexDetails = startOp.details
  }

  return result
}

/**
 * Finds filters that are not using an index (objective fact)
 */
function findFiltersWithoutIndex(
  operators: OperatorData[],
  totalDbHits: number
): FilterWithoutIndex[] {
  const filters: FilterWithoutIndex[] = []
  const MIN_DBHITS_THRESHOLD = 1000
  const MIN_COST_PERCENTAGE = 1

  for (const op of operators) {
    if (op.operatorType !== 'Filter') continue
    if (op.dbHits < MIN_DBHITS_THRESHOLD) continue
    if ((op.dbHits / totalDbHits) * 100 < MIN_COST_PERCENTAGE) continue
    if (!op.details) continue

    const { properties, labels } = parseFilterDetails(op.details)
    if (properties.length === 0) continue

    for (const prop of properties) {
      const [varName, propName] = prop.split('.')
      const label = labels[0] || inferLabelFromVariable(varName)

      filters.push({
        property: propName,
        label,
        filterDetails: op.details,
        dbHits: op.dbHits,
        depth: op.depth
      })
    }
  }

  // Sort by dbHits descending and deduplicate
  const seen = new Set<string>()
  return filters
    .sort((a, b) => b.dbHits - a.dbHits)
    .filter(f => {
      const key = `${f.label}.${f.property}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/**
 * Detects objectively problematic patterns (Cartesian products, Eager operators)
 */
function detectWarnings(operators: OperatorData[]): PlanWarning[] {
  const warnings: PlanWarning[] = []

  for (const op of operators) {
    // Cartesian Product - always problematic
    if (op.operatorType === 'CartesianProduct') {
      warnings.push({
        type: 'CARTESIAN_PRODUCT',
        depth: op.depth,
        operatorType: op.operatorType,
        description: `Cartesian product at depth ${op.depth} multiplies rows from both sides`,
        severity: 'high'
      })
    }

    // Eager operators - blocks streaming, objective fact
    if (
      op.operatorType === 'Eager' ||
      op.operatorType === 'Sort' ||
      op.operatorType === 'Top' ||
      op.operatorType === 'Distinct'
    ) {
      warnings.push({
        type: 'EAGER_OPERATOR',
        depth: op.depth,
        operatorType: op.operatorType,
        description: `${op.operatorType} buffers ${op.rows.toLocaleString()} rows before continuing`,
        severity: op.rows > 10000 ? 'high' : 'medium'
      })
    }
  }

  const severityOrder: Record<WarningSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2
  }
  return warnings.sort(
    (a, b) =>
      severityOrder[a.severity] - severityOrder[b.severity] || a.depth - b.depth
  )
}

/**
 * Generates the insights section - objective facts only
 */
function generateInsights(root: any, totalDbHits: number): PlanInsights {
  const operators = collectOperators(root)

  return {
    startingPoint: findStartingPoint(operators),
    filtersWithoutIndex: findFiltersWithoutIndex(operators, totalDbHits),
    warnings: detectWarnings(operators)
  }
}

/**
 * Extracts metadata from the plan root
 */
function extractMetadata(
  planRoot: any,
  totalDbHits: number,
  totalRows: number,
  planDepth: number
): QueryPlanJson['metadata'] {
  const metadata: QueryPlanJson['metadata'] = {
    totalDbHits,
    totalRows,
    planDepth
  }

  if (planRoot['planner-impl']) {
    metadata.planner = planRoot['planner-impl']
  } else if (planRoot.planner) {
    metadata.planner = planRoot.planner
  }

  if (planRoot['runtime-impl']) {
    metadata.runtime = planRoot['runtime-impl']
  } else if (planRoot.runtime) {
    metadata.runtime = planRoot.runtime
  }

  if (planRoot.version) {
    metadata.cypherVersion = planRoot.version
  }

  return metadata
}

/**
 * Converts an extracted plan to a JSON-serializable object
 * @param extractedPlan - The plan object returned from bolt.extractPlan()
 * @param query - Optional: the original Cypher query
 * @returns A clean JSON-serializable QueryPlanJson object
 */
export function serializePlanToJson(
  extractedPlan: { root: any },
  query?: string
): QueryPlanJson {
  const { root } = extractedPlan

  // Calculate totals first for cost percentages
  const totalDbHits =
    typeof root.totalDbHits === 'number'
      ? root.totalDbHits
      : calculateTotalDbHits(root)
  const totalRows = calculateTotalRows(root)
  const planDepth = calculatePlanDepth(root)

  const context: SerializationContext = {
    totalDbHits,
    cumulativeDbHits: 0
  }

  const result: QueryPlanJson = {
    schemaVersion: '1.3',
    exportedAt: new Date().toISOString(),
    metadata: extractMetadata(root, totalDbHits, totalRows, planDepth),
    analysis: generateAnalysis(root, totalDbHits),
    insights: generateInsights(root, totalDbHits),
    plan: serializeOperator(root, 0, context)
  }

  if (query) {
    result.query = query
  }

  return result
}

/**
 * Checks if a value is a simple/leaf value that should be inlined
 */
function isSimpleValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value !== 'object') return true
  if (Array.isArray(value)) {
    // Arrays of primitives are simple
    return value.every(item => typeof item !== 'object' || item === null)
  }
  return false
}

/**
 * Calculates the approximate line length of an inlined object
 */
function getInlineLength(value: unknown): number {
  return JSON.stringify(value).length
}

/**
 * Compact stringify that produces readable but condensed JSON.
 * - Small objects/arrays are kept on single lines
 * - Uses minimal indentation (1 space)
 * - Plan operators use compact formatting
 */
function compactStringify(obj: unknown, indent = 0): string {
  const pad = ' '.repeat(indent)
  const nextPad = ' '.repeat(indent + 1)

  if (obj === null) return 'null'
  if (obj === undefined) return 'undefined'
  if (typeof obj === 'string') return JSON.stringify(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'

    // Arrays of primitives or small objects stay inline
    if (obj.every(item => isSimpleValue(item)) && getInlineLength(obj) < 100) {
      return JSON.stringify(obj)
    }

    // Check if all items are small objects (like topCostOperators)
    const allSmallObjects = obj.every(
      item =>
        typeof item === 'object' && item !== null && getInlineLength(item) < 200
    )
    if (allSmallObjects) {
      const items = obj.map(item => nextPad + JSON.stringify(item))
      return '[\n' + items.join(',\n') + '\n' + pad + ']'
    }

    const items = obj.map(item => nextPad + compactStringify(item, indent + 1))
    return '[\n' + items.join(',\n') + '\n' + pad + ']'
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    if (entries.length === 0) return '{}'

    // Small objects without nested objects stay inline
    const hasNestedObjects = entries.some(
      ([, v]) => typeof v === 'object' && v !== null && !Array.isArray(v)
    )
    const hasArrays = entries.some(([, v]) => Array.isArray(v))

    if (!hasNestedObjects && !hasArrays && getInlineLength(obj) < 120) {
      return JSON.stringify(obj)
    }

    const lines = entries.map(([key, value]) => {
      const valueStr = compactStringify(value, indent + 1)
      return `${nextPad}"${key}": ${valueStr}`
    })
    return '{\n' + lines.join(',\n') + '\n' + pad + '}'
  }

  return String(obj)
}

/**
 * JSON output format options
 */
export type JsonFormat = 'pretty' | 'compact' | 'minified'

/**
 * Converts an extracted plan to a JSON string
 * @param extractedPlan - The plan object returned from bolt.extractPlan()
 * @param format - Output format: 'pretty' (2-space indent), 'compact' (condensed), 'minified' (no whitespace)
 * @param query - Optional: the original Cypher query
 * @returns JSON string representation of the plan
 */
export function planToJsonString(
  extractedPlan: { root: any },
  format: JsonFormat | boolean = 'compact',
  query?: string
): string {
  const json = serializePlanToJson(extractedPlan, query)

  // Handle legacy boolean parameter
  if (typeof format === 'boolean') {
    return format ? JSON.stringify(json, null, 2) : JSON.stringify(json)
  }

  switch (format) {
    case 'pretty':
      return JSON.stringify(json, null, 2)
    case 'minified':
      return JSON.stringify(json)
    case 'compact':
    default:
      return compactStringify(json)
  }
}
