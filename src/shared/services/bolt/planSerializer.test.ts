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
import {
  PlanOperatorJson,
  QueryPlanJson,
  planToJsonString,
  serializePlanToJson
} from './planSerializer'

describe('planSerializer', () => {
  describe('serializePlanToJson', () => {
    test('should serialize a simple plan with basic properties', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.schemaVersion).toBe('1.3')
      expect(result.exportedAt).toBeDefined()
      expect(result.plan.operatorType).toBe('ProduceResults')
      expect(result.plan.identifiers).toEqual(['n'])
      expect(result.plan.dbHits).toBe(0)
      expect(result.plan.rows).toBe(5)
      expect(result.plan.depth).toBe(0)
      expect(result.plan.costPercentage).toBe(0)
      expect(result.plan.cumulativeCost).toBe(0)
      expect(result.plan.children).toEqual([])
    })

    test('should normalize property names from internal format', () => {
      const extractedPlan = {
        root: {
          operatorType: 'NodeByLabelScan',
          identifiers: ['n'],
          DbHits: 150,
          Rows: 10,
          EstimatedRows: 100,
          PageCacheHits: 50,
          PageCacheMisses: 5,
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.dbHits).toBe(150)
      expect(result.plan.rows).toBe(10)
      expect(result.plan.estimatedRows).toBe(100)
      expect(result.plan.pageCacheHits).toBe(50)
      expect(result.plan.pageCacheMisses).toBe(5)
      expect(result.plan.pageCacheHitRatio).toBe(0.91)
    })

    test('should exclude D3 visual properties', () => {
      const extractedPlan = {
        root: {
          operatorType: 'Filter',
          identifiers: ['n'],
          DbHits: 10,
          Rows: 5,
          // Visual properties that should be excluded
          x: 100,
          y: 200,
          height: 50,
          costHeight: 30,
          rank: 1,
          expanded: true,
          index: 0,
          vx: 0.5,
          vy: 0.3,
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect((result.plan as any).x).toBeUndefined()
      expect((result.plan as any).y).toBeUndefined()
      expect((result.plan as any).height).toBeUndefined()
      expect((result.plan as any).costHeight).toBeUndefined()
      expect((result.plan as any).rank).toBeUndefined()
      expect((result.plan as any).expanded).toBeUndefined()
      expect((result.plan as any).index).toBeUndefined()
      expect((result.plan as any).vx).toBeUndefined()
      expect((result.plan as any).vy).toBeUndefined()
    })

    test('should recursively process children operators with depth tracking', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          children: [
            {
              operatorType: 'Filter',
              identifiers: ['n'],
              DbHits: 10,
              Rows: 5,
              children: [
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['n'],
                  DbHits: 150,
                  Rows: 100,
                  children: []
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.depth).toBe(0)
      expect(result.plan.children.length).toBe(1)
      expect(result.plan.children[0].operatorType).toBe('Filter')
      expect(result.plan.children[0].depth).toBe(1)
      expect(result.plan.children[0].dbHits).toBe(10)
      expect(result.plan.children[0].children.length).toBe(1)
      expect(result.plan.children[0].children[0].operatorType).toBe(
        'NodeByLabelScan'
      )
      expect(result.plan.children[0].children[0].depth).toBe(2)
      expect(result.plan.children[0].children[0].dbHits).toBe(150)
    })

    test('should extract metadata from plan root with new fields', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          Rows: 10,
          version: 'CYPHER 5.0',
          planner: 'COST',
          runtime: 'PIPELINED',
          'planner-impl': 'IDP',
          'runtime-impl': 'PIPELINED',
          totalDbHits: 160,
          children: [
            {
              operatorType: 'NodeByLabelScan',
              identifiers: ['n'],
              DbHits: 160,
              Rows: 10,
              children: []
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.metadata.cypherVersion).toBe('CYPHER 5.0')
      expect(result.metadata.planner).toBe('IDP')
      expect(result.metadata.runtime).toBe('PIPELINED')
      expect(result.metadata.totalDbHits).toBe(160)
      expect(result.metadata.totalRows).toBe(10)
      expect(result.metadata.planDepth).toBe(1)
    })

    test('should use planner/runtime when planner-impl/runtime-impl not available', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          planner: 'COST',
          runtime: 'SLOTTED',
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.metadata.planner).toBe('COST')
      expect(result.metadata.runtime).toBe('SLOTTED')
    })

    test('should include string properties like Details and Expression', () => {
      const extractedPlan = {
        root: {
          operatorType: 'NodeByLabelScan',
          identifiers: ['n'],
          Details: ':Person',
          Expression: 'n.age > 18',
          Index: 'idx_person_name',
          Order: 'n.name ASC',
          KeyNames: 'n.name',
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.details).toBe(':Person')
      expect(result.plan.expression).toBe('n.age > 18')
      expect(result.plan.index).toBe('idx_person_name')
      expect(result.plan.order).toBe('n.name ASC')
      expect(result.plan.keyNames).toBe('n.name')
    })

    test('should handle missing children gracefully', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n']
          // no children property
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.children).toEqual([])
    })

    test('should handle missing identifiers gracefully', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults'
          // no identifiers property
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.identifiers).toEqual([])
    })

    test('should filter out anonymous identifiers', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n', 'anon_0', 'm', 'anon_1', '  something', 'r'],
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.identifiers).toEqual(['n', 'm', 'r'])
    })

    test('should clean @graph.db suffix from operator types', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults@graph.db',
          identifiers: ['n'],
          children: [
            {
              operatorType: 'Filter@neo4j',
              identifiers: ['n'],
              children: []
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.operatorType).toBe('ProduceResults')
      expect(result.plan.children[0].operatorType).toBe('Filter')
    })

    test('should include query when provided', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const result = serializePlanToJson(
        extractedPlan,
        'MATCH (n:Person) RETURN n'
      )

      expect(result.query).toBe('MATCH (n:Person) RETURN n')
    })

    test('should calculate cost percentages correctly', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          children: [
            {
              operatorType: 'Filter',
              identifiers: ['n'],
              DbHits: 50,
              Rows: 5,
              children: [
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['n'],
                  DbHits: 150,
                  Rows: 100,
                  children: []
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      // Total dbHits = 0 + 50 + 150 = 200
      expect(result.metadata.totalDbHits).toBe(200)
      expect(result.plan.costPercentage).toBe(0)
      expect(result.plan.children[0].costPercentage).toBe(25)
      expect(result.plan.children[0].children[0].costPercentage).toBe(75)
    })

    test('should calculate cumulative cost correctly', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 10,
          children: [
            {
              operatorType: 'Filter',
              identifiers: ['n'],
              DbHits: 20,
              children: [
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['n'],
                  DbHits: 30,
                  children: []
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.cumulativeCost).toBe(10)
      expect(result.plan.children[0].cumulativeCost).toBe(30)
      expect(result.plan.children[0].children[0].cumulativeCost).toBe(60)
    })

    test('should calculate estimation accuracy', () => {
      const extractedPlan = {
        root: {
          operatorType: 'NodeByLabelScan',
          identifiers: ['n'],
          DbHits: 100,
          Rows: 500,
          EstimatedRows: 1000,
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.estimatedRows).toBe(1000)
      expect(result.plan.estimationAccuracy).toBe(0.5) // 500/1000
    })

    test('should handle Neo4j Int64 objects for memory fields', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          Memory: { low: 64, high: 0 },
          GlobalMemory: { low: 128, high: 0 },
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.memory).toBe(64)
      expect(result.plan.globalMemory).toBe(128)
    })

    test('should handle numeric memory fields', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          Memory: 256,
          GlobalMemory: 512,
          children: []
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.plan.memory).toBe(256)
      expect(result.plan.globalMemory).toBe(512)
    })
  })

  describe('analysis section', () => {
    test('should count operators by type', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: [
            {
              operatorType: 'Filter',
              identifiers: ['n'],
              children: [
                {
                  operatorType: 'Filter',
                  identifiers: ['n'],
                  children: [
                    {
                      operatorType: 'NodeByLabelScan',
                      identifiers: ['n'],
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.analysis.operatorCount).toBe(4)
      expect(result.analysis.operatorsByType).toEqual({
        ProduceResults: 1,
        Filter: 2,
        NodeByLabelScan: 1
      })
    })

    test('should identify top cost operators', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          children: [
            {
              operatorType: 'Expand(All)',
              identifiers: ['n', 'm'],
              DbHits: 300,
              Details: '(n)-[r:KNOWS]->(m)',
              children: [
                {
                  operatorType: 'Filter',
                  identifiers: ['n'],
                  DbHits: 100,
                  children: [
                    {
                      operatorType: 'NodeByLabelScan',
                      identifiers: ['n'],
                      DbHits: 600,
                      Details: ':Person',
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.analysis.topCostOperators.length).toBe(4)
      // First should be NodeByLabelScan with highest dbHits
      expect(result.analysis.topCostOperators[0].operatorType).toBe(
        'NodeByLabelScan'
      )
      expect(result.analysis.topCostOperators[0].dbHits).toBe(600)
      expect(result.analysis.topCostOperators[0].costPercentage).toBe(60)
      expect(result.analysis.topCostOperators[0].details).toBe(':Person')
      // Second should be Expand(All)
      expect(result.analysis.topCostOperators[1].operatorType).toBe(
        'Expand(All)'
      )
      expect(result.analysis.topCostOperators[1].dbHits).toBe(300)
    })

    test('should identify estimation issues', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          Rows: 100,
          EstimatedRows: 100, // Accurate
          children: [
            {
              operatorType: 'Filter',
              identifiers: ['n'],
              Rows: 5000,
              EstimatedRows: 100, // Off by 50x - should be flagged
              children: [
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['n'],
                  Rows: 10,
                  EstimatedRows: 100, // Off by 10x - should be flagged
                  children: []
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.analysis.estimationIssues.length).toBe(2)
      // Filter has accuracy 50 (5000/100)
      expect(result.analysis.estimationIssues[0].operatorType).toBe('Filter')
      expect(result.analysis.estimationIssues[0].actualRows).toBe(5000)
      expect(result.analysis.estimationIssues[0].estimatedRows).toBe(100)
      expect(result.analysis.estimationIssues[0].accuracy).toBe(50)
      // NodeByLabelScan has accuracy 0.1 (10/100)
      expect(result.analysis.estimationIssues[1].operatorType).toBe(
        'NodeByLabelScan'
      )
      expect(result.analysis.estimationIssues[1].accuracy).toBe(0.1)
    })

    test('should not flag accurate estimations', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          Rows: 100,
          EstimatedRows: 80, // Accuracy 1.25 - within threshold
          children: [
            {
              operatorType: 'NodeByLabelScan',
              identifiers: ['n'],
              Rows: 100,
              EstimatedRows: 150, // Accuracy 0.67 - within threshold
              children: []
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.analysis.estimationIssues.length).toBe(0)
    })
  })

  describe('insights section', () => {
    test('should identify starting point with NodeByLabelScan', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          children: [
            {
              operatorType: 'NodeByLabelScan',
              identifiers: ['n'],
              DbHits: 100,
              Rows: 5,
              Details: ':Person',
              children: []
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.insights.startingPoint.label).toBe('Person')
      expect(result.insights.startingPoint.operator).toBe('NodeByLabelScan')
      expect(result.insights.startingPoint.rows).toBe(5)
      expect(result.insights.startingPoint.usesIndex).toBe(false)
    })

    test('should identify starting point with NodeIndexSeek', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 10,
          children: [
            {
              operatorType: 'NodeIndexSeek',
              identifiers: ['n'],
              DbHits: 11,
              Rows: 10,
              Details: 'BTREE INDEX n:Person(name) WHERE name = $param',
              children: []
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.insights.startingPoint.label).toBe('Person')
      expect(result.insights.startingPoint.operator).toBe('NodeIndexSeek')
      expect(result.insights.startingPoint.usesIndex).toBe(true)
      expect(result.insights.startingPoint.indexDetails).toContain(
        'BTREE INDEX'
      )
    })

    test('should detect filters without index', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          children: [
            {
              operatorType: 'Filter',
              identifiers: ['tx'],
              DbHits: 5000,
              Details: 'tx.fiscalPeriod = $param AND tx:Transaction',
              children: [
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['tx'],
                  DbHits: 1000,
                  Details: ':Transaction',
                  children: []
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.insights.filtersWithoutIndex.length).toBeGreaterThan(0)
      expect(result.insights.filtersWithoutIndex[0].property).toBe(
        'fiscalPeriod'
      )
      expect(result.insights.filtersWithoutIndex[0].label).toBe('Transaction')
      expect(result.insights.filtersWithoutIndex[0].dbHits).toBe(5000)
    })

    test('should detect cartesian product warning', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n', 'm'],
          DbHits: 0,
          children: [
            {
              operatorType: 'CartesianProduct',
              identifiers: ['n', 'm'],
              DbHits: 10000,
              Rows: 1000,
              children: [
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['n'],
                  DbHits: 100,
                  Rows: 100,
                  Details: ':Person',
                  children: []
                },
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['m'],
                  DbHits: 100,
                  Rows: 100,
                  Details: ':Company',
                  children: []
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      const cartesianWarning = result.insights.warnings.find(
        w => w.type === 'CARTESIAN_PRODUCT'
      )
      expect(cartesianWarning).toBeDefined()
      expect(cartesianWarning?.severity).toBe('high')
    })

    test('should detect eager operator warning', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          children: [
            {
              operatorType: 'Sort',
              identifiers: ['n'],
              DbHits: 5000,
              Rows: 15000,
              children: [
                {
                  operatorType: 'NodeByLabelScan',
                  identifiers: ['n'],
                  DbHits: 1000,
                  Rows: 15000,
                  Details: ':Person',
                  children: []
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      const eagerWarning = result.insights.warnings.find(
        w => w.type === 'EAGER_OPERATOR'
      )
      expect(eagerWarning).toBeDefined()
      expect(eagerWarning?.operatorType).toBe('Sort')
    })

    test('should return empty insights for simple plan without issues', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          children: [
            {
              operatorType: 'NodeByLabelScan',
              identifiers: ['n'],
              DbHits: 100,
              Rows: 5,
              Details: ':Person',
              children: []
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.insights.filtersWithoutIndex.length).toBe(0)
      expect(result.insights.warnings.length).toBe(0)
      expect(result.insights.startingPoint.label).toBe('Person')
    })
  })

  describe('planToJsonString', () => {
    test('should return compact JSON by default', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const result = planToJsonString(extractedPlan)

      // Compact JSON should have newlines but use 1-space indentation per level
      expect(result).toContain('\n')
      // First level keys should have single space indent (not 2 spaces like pretty)
      expect(result).toMatch(/^\s"schemaVersion"/m)
      expect(result).not.toMatch(/^\s{2}"schemaVersion"/m)
    })

    test('should return pretty-printed JSON when format is pretty', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const result = planToJsonString(extractedPlan, 'pretty')

      // Pretty printed JSON should have 2-space indentation
      expect(result).toContain('\n')
      expect(result).toMatch(/^ {2}"/m)
    })

    test('should return minified JSON when format is minified', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const result = planToJsonString(extractedPlan, 'minified')

      // Minified JSON should not have newlines
      expect(result).not.toContain('\n')
    })

    test('should handle legacy boolean parameter (true = pretty)', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const result = planToJsonString(extractedPlan, true)

      // Should behave like pretty mode
      expect(result).toContain('\n')
      expect(result).toMatch(/^ {2}"/m)
    })

    test('should handle legacy boolean parameter (false = minified)', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const result = planToJsonString(extractedPlan, false)

      // Should behave like minified mode
      expect(result).not.toContain('\n')
    })

    test('should produce valid parseable JSON in all formats', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 0,
          Rows: 5,
          version: 'CYPHER 5.0',
          children: [
            {
              operatorType: 'NodeByLabelScan',
              identifiers: ['n'],
              DbHits: 150,
              Rows: 5,
              children: []
            }
          ]
        }
      }

      // Test all formats produce valid JSON
      const formats: Array<'compact' | 'pretty' | 'minified'> = [
        'compact',
        'pretty',
        'minified'
      ]
      for (const format of formats) {
        const jsonString = planToJsonString(extractedPlan, format)
        const parsed = JSON.parse(jsonString) as QueryPlanJson

        expect(parsed.schemaVersion).toBe('1.3')
        expect(parsed.plan.operatorType).toBe('ProduceResults')
        expect(parsed.plan.children[0].operatorType).toBe('NodeByLabelScan')
      }
    })

    test('compact format should inline small objects', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          DbHits: 10,
          Rows: 5,
          children: []
        }
      }

      const result = planToJsonString(extractedPlan, 'compact')

      // Metadata should be on a single line (inline small object)
      const parsed = JSON.parse(result)
      expect(parsed).toBeDefined()
      // Result should be more compact than pretty but still readable
      const prettyResult = planToJsonString(extractedPlan, 'pretty')
      expect(result.length).toBeLessThan(prettyResult.length)
    })

    test('should include ISO timestamp in exportedAt', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const jsonString = planToJsonString(extractedPlan)
      const parsed = JSON.parse(jsonString) as QueryPlanJson

      // Should be a valid ISO date string
      const date = new Date(parsed.exportedAt)
      expect(date.toISOString()).toBe(parsed.exportedAt)
    })

    test('should include query when provided', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n'],
          children: []
        }
      }

      const jsonString = planToJsonString(
        extractedPlan,
        'pretty',
        'MATCH (n) RETURN n'
      )
      const parsed = JSON.parse(jsonString) as QueryPlanJson

      expect(parsed.query).toBe('MATCH (n) RETURN n')
    })
  })

  describe('complex plan serialization', () => {
    test('should serialize a realistic query plan', () => {
      const extractedPlan = {
        root: {
          operatorType: 'ProduceResults',
          identifiers: ['n', 'm', 'r', 'anon_0', 'anon_1'],
          DbHits: 0,
          Rows: 10,
          version: 'CYPHER 5.0',
          'planner-impl': 'IDP',
          'runtime-impl': 'PIPELINED',
          totalDbHits: 500,
          children: [
            {
              operatorType: 'Expand(All)@graph.db',
              identifiers: ['n', 'm', 'r'],
              DbHits: 100,
              Rows: 10,
              Details: '(n)-[r:KNOWS]->(m)',
              children: [
                {
                  operatorType: 'Filter',
                  identifiers: ['n'],
                  DbHits: 200,
                  Rows: 50,
                  Expression: 'n.age > 25',
                  children: [
                    {
                      operatorType: 'NodeByLabelScan',
                      identifiers: ['n'],
                      DbHits: 200,
                      Rows: 100,
                      Details: ':Person',
                      EstimatedRows: 1000,
                      children: []
                    }
                  ]
                }
              ]
            }
          ]
        }
      }

      const result = serializePlanToJson(extractedPlan)

      expect(result.schemaVersion).toBe('1.3')
      expect(result.metadata.cypherVersion).toBe('CYPHER 5.0')
      expect(result.metadata.planner).toBe('IDP')
      expect(result.metadata.runtime).toBe('PIPELINED')
      expect(result.metadata.totalDbHits).toBe(500)
      expect(result.metadata.totalRows).toBe(10)
      expect(result.metadata.planDepth).toBe(3)

      // Check analysis section
      expect(result.analysis.operatorCount).toBe(4)
      expect(result.analysis.operatorsByType['Filter']).toBe(1)
      expect(result.analysis.operatorsByType['Expand(All)']).toBe(1)
      expect(result.analysis.topCostOperators[0].dbHits).toBe(200) // Filter or NodeByLabelScan

      // Check root plan
      const root = result.plan
      expect(root.operatorType).toBe('ProduceResults')
      expect(root.identifiers).toEqual(['n', 'm', 'r']) // anon_ filtered out
      expect(root.dbHits).toBe(0)
      expect(root.rows).toBe(10)
      expect(root.depth).toBe(0)

      const expand = root.children[0]
      expect(expand.operatorType).toBe('Expand(All)') // @graph.db cleaned
      expect(expand.details).toBe('(n)-[r:KNOWS]->(m)')
      expect(expand.depth).toBe(1)

      const filter = expand.children[0]
      expect(filter.operatorType).toBe('Filter')
      expect(filter.expression).toBe('n.age > 25')
      expect(filter.depth).toBe(2)

      const scan = filter.children[0]
      expect(scan.operatorType).toBe('NodeByLabelScan')
      expect(scan.details).toBe(':Person')
      expect(scan.estimatedRows).toBe(1000)
      expect(scan.depth).toBe(3)
      expect(scan.estimationAccuracy).toBe(0.1) // 100/1000
    })
  })
})
