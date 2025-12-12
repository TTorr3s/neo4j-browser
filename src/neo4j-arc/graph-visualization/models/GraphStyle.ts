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
import { calculateDefaultNodeColors } from '@neo4j-devtools/word-color'

import { selectorArrayToString, selectorStringToArray } from '../utils/utils'

export class Selector {
  tag = ''
  classes: string[] = []
  constructor(tag: string, classes: null | string[]) {
    this.tag = tag
    this.classes = classes ?? []
  }

  toString = (): string => {
    return selectorArrayToString([this.tag].concat(this.classes))
  }
}

class StyleElement {
  selector: Selector
  props: any
  constructor(selector: Selector) {
    this.selector = selector
    this.props = {}
  }

  applyRules = (rules: StyleRule[]) => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (rule.matches(this.selector)) {
        this.props = { ...this.props, ...rule.props }
        this.props.caption = this.props.caption || this.props.defaultCaption
      }
    }
    return this
  }

  get = (attr: string) => {
    return this.props[attr] || ''
  }
}

class StyleRule {
  selector: Selector
  props: Record<string, string>
  constructor(selector1: Selector, props1: Record<string, string>) {
    this.selector = selector1
    this.props = props1
  }

  matches = (selector: Selector) => {
    if (this.selector.tag !== selector.tag) {
      return false
    }
    for (let i = 0; i < this.selector.classes.length; i++) {
      const selectorClass = this.selector.classes[i]
      if (
        selectorClass != null &&
        selector.classes.indexOf(selectorClass) === -1
      ) {
        return false
      }
    }
    return true
  }

  matchesExact = (selector: Selector) => {
    return (
      this.matches(selector) &&
      this.selector.classes.length === selector.classes.length
    )
  }
}

// Tokyo Night inspired default style
const DEFAULT_STYLE = {
  node: {
    diameter: '50px',
    color: '#7aa2f7', // Tokyo Night blue
    'border-color': '#3d59a1', // Tokyo Night dark blue
    'border-width': '2px',
    'text-color-internal': '#1a1b26', // Tokyo Night dark background
    'font-size': '10px'
  },
  relationship: {
    color: '#7dcfff', // Tokyo Night cyan
    'shaft-width': '1px',
    'font-size': '8px',
    padding: '3px',
    'text-color-external': '#c0caf5', // Tokyo Night light text
    'text-color-internal': '#1a1b26', // Tokyo Night dark
    caption: '<type>'
  }
}
type DefaultSizeType = { diameter: string }
const DEFAULT_SIZES: DefaultSizeType[] = [
  {
    diameter: '10px'
  },
  {
    diameter: '20px'
  },
  {
    diameter: '50px'
  },
  {
    diameter: '65px'
  },
  {
    diameter: '80px'
  }
]
type DefaultArrayWidthType = { 'shaft-width': string }
const DEFAULT_ARRAY_WIDTHS: DefaultArrayWidthType[] = [
  {
    'shaft-width': '1px'
  },
  {
    'shaft-width': '2px'
  },
  {
    'shaft-width': '3px'
  },
  {
    'shaft-width': '5px'
  },
  {
    'shaft-width': '8px'
  },
  {
    'shaft-width': '13px'
  },
  {
    'shaft-width': '25px'
  },
  {
    'shaft-width': '38px'
  }
]

type DefaultColorType = {
  color: string
  'border-color': string
  'text-color-internal': string
}
// Tokyo Night inspired color palette for graph nodes
const DEFAULT_COLORS: DefaultColorType[] = [
  {
    color: '#bb9af7', // Purple
    'border-color': '#9d7cd8',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#7aa2f7', // Blue
    'border-color': '#3d59a1',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#7dcfff', // Cyan
    'border-color': '#2ac3de',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#9ece6a', // Green
    'border-color': '#73daca',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#f7768e', // Red/Pink
    'border-color': '#db4b4b',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#ff9e64', // Orange
    'border-color': '#e0af68',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#e0af68', // Yellow
    'border-color': '#cfc9c2',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#73daca', // Teal
    'border-color': '#449dab',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#2ac3de', // Light Blue
    'border-color': '#0db9d7',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#b4f9f8', // Light Cyan
    'border-color': '#89ddff',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#c0caf5', // Light Gray
    'border-color': '#a9b1d6',
    'text-color-internal': '#1a1b26'
  },
  {
    color: '#ff7a93', // Coral
    'border-color': '#f7768e',
    'text-color-internal': '#1a1b26'
  }
]

export class GraphStyleModel {
  rules: StyleRule[]
  // Cache for relationship styles by type - avoids recalculating on every tick
  private relationshipStyleCache: Map<string, StyleElement> = new Map()

  constructor(private useGeneratedDefaultColors: boolean = false) {
    this.rules = []
    try {
      this.loadRules()
    } catch (_error) {
      // e = _error
    }
  }

  private invalidateRelationshipStyleCache = (): void => {
    this.relationshipStyleCache.clear()
  }

  parseSelector = function (key: string): Selector {
    const tokens = selectorStringToArray(key)
    return new Selector(tokens[0], tokens.slice(1))
  }

  nodeSelector = function (
    node: { labels: null | string[] } = { labels: null }
  ): Selector {
    const classes = node.labels != null ? node.labels : []
    return new Selector('node', classes)
  }

  relationshipSelector = function (
    rel: { type: null | string } = { type: null }
  ): Selector {
    const classes = rel.type != null ? [rel.type] : []
    return new Selector('relationship', classes)
  }

  findRule = function (
    selector: Selector,
    rules: StyleRule[]
  ): StyleRule | undefined {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (rule.matchesExact(selector)) {
        return rule
      }
    }
    return undefined
  }

  findAvailableDefaultColor = function (rules: StyleRule[]): DefaultColorType {
    const usedColors = rules
      .filter((rule: StyleRule) => {
        return rule.props.color != null
      })
      .map((rule: StyleRule) => {
        return rule.props.color
      })
    const index =
      // @ts-expect-error ts-migrate(2365) FIXME: Operator '>' cannot be applied to types 'number' a... Remove this comment to see the full error message
      usedColors.length - 1 > DEFAULT_COLORS ? 0 : usedColors.length - 1
    return DEFAULT_COLORS[index]
  }

  getDefaultNodeCaption = function (
    item: any
  ): { caption: string } | { defaultCaption: string } {
    if (
      !item ||
      // @ts-expect-error ts-migrate(2365) FIXME: Operator '>' cannot be applied to types 'boolean' ... Remove this comment to see the full error message
      !(item.propertyList != null ? item.propertyList.length : 0) > 0
    ) {
      return {
        defaultCaption: '<id>'
      }
    }
    const captionPrioOrder = [
      /^name$/i,
      /^title$/i,
      /^label$/i,
      /name$/i,
      /description$/i,
      /^.+/
    ]
    let defaultCaption = captionPrioOrder.reduceRight((leading, current) => {
      const hits = item.propertyList.filter((prop: any) =>
        current.test(prop.key)
      )
      if (hits.length) {
        return `{${hits[0].key}}`
      } else {
        return leading
      }
    }, '')
    defaultCaption || (defaultCaption = '<id>')
    return {
      caption: defaultCaption
    }
  }

  calculateStyle = (selector: Selector): StyleElement => {
    return new StyleElement(selector).applyRules(this.rules)
  }

  setDefaultNodeStyle = (selector: Selector, item: any): void => {
    let defaultColor = true
    let defaultCaption = true
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i]
      if (rule.selector.classes.length > 0 && rule.matches(selector)) {
        if (rule.props.hasOwnProperty('color')) {
          defaultColor = false
        }
        if (rule.props.hasOwnProperty('caption')) {
          defaultCaption = false
        }
      }
    }
    const minimalSelector = new Selector(
      selector.tag,
      selector.classes.sort().slice(0, 1)
    )
    if (defaultColor) {
      const calcColor = (label: Selector): DefaultColorType => {
        const { backgroundColor, borderColor, textColor } =
          calculateDefaultNodeColors(label.classes[0])

        return {
          'border-color': borderColor,
          'text-color-internal': textColor,
          color: backgroundColor
        }
      }

      this.changeForSelector(
        minimalSelector,
        this.useGeneratedDefaultColors
          ? calcColor(minimalSelector)
          : this.findAvailableDefaultColor(this.rules)
      )
    }
    if (defaultCaption) {
      this.changeForSelector(minimalSelector, this.getDefaultNodeCaption(item))
    }
  }

  changeForSelector = (selector: Selector, props: any): StyleRule => {
    let rule = this.findRule(selector, this.rules)
    if (rule == null) {
      rule = new StyleRule(selector, props)
      this.rules.push(rule)
    }
    rule.props = { ...rule.props, ...props }

    // Invalidate cache if relationship styles changed
    if (selector.tag === 'relationship') {
      this.invalidateRelationshipStyleCache()
    }

    return rule
  }

  destroyRule = (rule: StyleRule): void => {
    const idx = this.rules.indexOf(rule)
    if (idx != null) {
      this.rules.splice(idx, 1)
    }
  }

  importGrass = (string: string): void => {
    try {
      const rules = this.parse(string)
      this.loadRules(rules)
    } catch (_error) {
      // e = _error
    }
  }

  parse = function (string: string) {
    const chars = string.split('')
    let insideString = false
    let insideProps = false
    let keyword = ''
    let props = ''
    const rules: any = {}
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i]
      let skipThis = true
      switch (c) {
        case '{':
          if (!insideString) {
            insideProps = true
          } else {
            skipThis = false
          }
          break
        case '}':
          if (!insideString) {
            insideProps = false
            rules[keyword] = props
            keyword = ''
            props = ''
          } else {
            skipThis = false
          }
          break
        case "'":
          // @ts-expect-error ts-migrate(2447) FIXME: The '^=' operator is not allowed for boolean types... Remove this comment to see the full error message
          insideString ^= true
          break
        default:
          skipThis = false
      }
      if (skipThis) {
        continue
      }
      if (insideProps) {
        props += c
      } else {
        if (!c.match(/[\s\n]/)) {
          keyword += c
        }
      }
    }
    for (const k in rules) {
      const v = rules[k]
      rules[k] = {}
      v.split(';').forEach((prop: any) => {
        const [key, val] = prop.split(':')
        if (key && val) {
          rules[k][key.trim()] = val.trim()
        }
      })
    }
    return rules
  }

  resetToDefault = (): void => {
    this.loadRules()
  }

  toSheet = () => {
    const sheet: any = {}
    this.rules.forEach((rule: StyleRule) => {
      sheet[rule.selector.toString()] = rule.props
    })
    return sheet
  }

  toString = (): string => {
    let str = ''
    this.rules.forEach((r: StyleRule) => {
      str += `${r.selector.toString()} {\n`
      for (const k in r.props) {
        let v = r.props[k]
        if (k === 'caption') {
          v = `'${v}'`
        }
        str += `  ${k}: ${v};\n`
      }
      str += '}\n\n'
    })
    return str
  }

  loadRules = (data?: any): void => {
    const localData = typeof data === 'object' ? data : DEFAULT_STYLE
    this.rules = []
    for (const key in localData) {
      const props = localData[key]
      this.rules.push(new StyleRule(this.parseSelector(key), props))
    }
    this.invalidateRelationshipStyleCache()
  }

  defaultSizes = function (): DefaultSizeType[] {
    return DEFAULT_SIZES
  }

  defaultArrayWidths = function (): DefaultArrayWidthType[] {
    return DEFAULT_ARRAY_WIDTHS
  }

  defaultColors = function (): DefaultColorType[] {
    return DEFAULT_COLORS
  }

  interpolate = (str: any, item: any) => {
    let ips = str.replace(/\{([^{}]*)\}/g, (_a: any, b: any) => {
      const r = item.propertyMap[b]
      if (typeof r === 'object') {
        return r.join(', ')
      }
      if (typeof r === 'string' || typeof r === 'number') {
        return r
      }
      return ''
    })
    if (ips.length < 1 && str === '{type}' && item.isRelationship) {
      ips = '<type>'
    }
    if (ips.length < 1 && str === '{id}' && item.isNode) {
      ips = '<id>'
    }
    return ips.replace(/^<(id|type)>$/, (_a: any, b: any) => {
      const r = item[b]
      if (typeof r === 'string' || typeof r === 'number') {
        return r
      }
      return ''
    })
  }

  forNode = (node: any = {}): StyleElement => {
    const selector = this.nodeSelector(node)
    if ((node.labels != null ? node.labels.length : 0) > 0) {
      this.setDefaultNodeStyle(selector, node)
    }
    return this.calculateStyle(selector)
  }

  forRelationship = (rel: any): StyleElement => {
    const cacheKey = rel?.type ?? '__default__'

    const cached = this.relationshipStyleCache.get(cacheKey)
    if (cached) return cached

    const selector = this.relationshipSelector(rel)
    const style = this.calculateStyle(selector)
    this.relationshipStyleCache.set(cacheKey, style)
    return style
  }
}
