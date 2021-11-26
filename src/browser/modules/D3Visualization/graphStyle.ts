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
  selectorStringToArray,
  selectorArrayToString
} from 'services/grassUtils'

export class Selector {
  tag = ''
  classes: string[] = []
  constructor(tag1: string, classes1: null | string[]) {
    this.tag = tag1
    this.classes = classes1 != null ? classes1 : []
  }

  toString = () => {
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

  get = (attr: any) => {
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
      const classs = this.selector.classes[i]
      if (classs != null && selector.classes.indexOf(classs) === -1) {
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

const defaultStyle = {
  node: {
    diameter: '50px',
    color: '#A5ABB6',
    'border-color': '#9AA1AC',
    'border-width': '2px',
    'text-color-internal': '#FFFFFF',
    'font-size': '10px'
  },
  relationship: {
    color: '#A5ABB6',
    'shaft-width': '1px',
    'font-size': '8px',
    padding: '3px',
    'text-color-external': '#000000',
    'text-color-internal': '#FFFFFF',
    caption: '<type>'
  }
}
const defaultSizes = [
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
const defaultIconCodes = [
  {
    'icon-code': 'a'
  },
  {
    'icon-code': '"'
  },
  {
    'icon-code': 'z'
  },
  {
    'icon-code': '_'
  },
  {
    'icon-code': '/'
  },
  {
    'icon-code': '>'
  },
  {
    'icon-code': 'k'
  }
]
const defaultArrayWidths = [
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
const defaultColors: DefaultColorType[] = [
  {
    color: '#604A0E',
    'border-color': '#423204',
    'text-color-internal': '#FFFFFF'
  },
  {
    color: '#C990C0',
    'border-color': '#b261a5',
    'text-color-internal': '#FFFFFF'
  },
  {
    color: '#F79767',
    'border-color': '#f36924',
    'text-color-internal': '#FFFFFF'
  },
  {
    color: '#57C7E3',
    'border-color': '#23b3d7',
    'text-color-internal': '#2A2C34'
  },
  {
    color: '#F16667',
    'border-color': '#eb2728',
    'text-color-internal': '#FFFFFF'
  },
  {
    color: '#D9C8AE',
    'border-color': '#c0a378',
    'text-color-internal': '#2A2C34'
  },
  {
    color: '#8DCC93',
    'border-color': '#5db665',
    'text-color-internal': '#2A2C34'
  },
  {
    color: '#ECB5C9',
    'border-color': '#da7298',
    'text-color-internal': '#2A2C34'
  },
  {
    color: '#4C8EDA',
    'border-color': '#2870c2',
    'text-color-internal': '#FFFFFF'
  },
  {
    color: '#FFC454',
    'border-color': '#d7a013',
    'text-color-internal': '#2A2C34'
  },
  {
    color: '#DA7194',
    'border-color': '#cc3c6c',
    'text-color-internal': '#FFFFFF'
  },
  {
    color: '#569480',
    'border-color': '#447666',
    'text-color-internal': '#FFFFFF'
  }
]

export class GraphStyle {
  rules: StyleRule[]

  constructor() {
    this.rules = []
    try {
      this.loadRules()
    } catch (_error) {
      // e = _error
    }
  }

  parseSelector = function(key: string): Selector {
    const tokens = selectorStringToArray(key)
    return new Selector(tokens[0], tokens.slice(1))
  }

  // TODO: remove not used?
  selector = (item: any) => {
    if (item.isNode) {
      return this.nodeSelector(item)
    } else if (item.isRelationship) {
      return this.relationshipSelector(item)
    } else {
      return undefined
    }
  }

  nodeSelector = function(
    node: { labels: null | string[] } = { labels: null }
  ): Selector {
    const classes = node.labels != null ? node.labels : []
    return new Selector('node', classes)
  }

  relationshipSelector = function(
    rel: { type: null | string } = { type: null }
  ): Selector {
    const classes = rel.type != null ? [rel.type] : []
    return new Selector('relationship', classes)
  }

  findRule = function(
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

  findAvailableDefaultColor = function(rules: StyleRule[]): DefaultColorType {
    const usedColors = rules
      .filter((rule: StyleRule) => {
        return rule.props.color != null
      })
      .map((rule: StyleRule) => {
        return rule.props.color
      })
    const index =
      // @ts-expect-error ts-migrate(2365) FIXME: Operator '>' cannot be applied to types 'number' a... Remove this comment to see the full error message
      usedColors.length - 1 > defaultColors ? 0 : usedColors.length - 1
    return defaultColors[index]
  }

  getDefaultNodeCaption = function(item: any) {
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

  calculateStyle = (selector: Selector) => {
    return new StyleElement(selector).applyRules(this.rules)
  }

  forEntity = (item: any) => {
    const selector = this.selector(item)
    if (selector) {
      return this.calculateStyle(selector)
    } else {
      return undefined
    }
  }

  setDefaultNodeStyling = (selector: Selector, item: any) => {
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
      this.changeForSelector(
        minimalSelector,
        this.findAvailableDefaultColor(this.rules)
      )
    }
    if (defaultCaption) {
      return this.changeForSelector(
        minimalSelector,
        this.getDefaultNodeCaption(item)
      )
    }
    return undefined
  }

  changeForSelector = (selector: Selector, props: any): StyleRule => {
    let rule = this.findRule(selector, this.rules)
    if (rule == null) {
      rule = new StyleRule(selector, props)
      this.rules.push(rule)
    }
    rule.props = { ...rule.props, ...props }
    return rule
  }

  destroyRule = (rule: StyleRule) => {
    const idx = this.rules.indexOf(rule)
    if (idx != null) {
      this.rules.splice(idx, 1)
    }
  }

  importGrass = (string: any) => {
    try {
      const rules = this.parse(string)
      return this.loadRules(rules)
    } catch (_error) {
      // e = _error
      return undefined
    }
  }

  parse = function(string: string) {
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

  resetToDefault = () => {
    this.loadRules()
    return true
  }

  toSheet = () => {
    const sheet: any = {}
    this.rules.forEach((rule: StyleRule) => {
      sheet[rule.selector.toString()] = rule.props
    })
    return sheet
  }

  toString = () => {
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

  loadRules = (data?: any) => {
    const localData = typeof data === 'object' ? data : defaultStyle
    this.rules.length = 0
    for (const key in localData) {
      const props = localData[key]
      this.rules.push(new StyleRule(this.parseSelector(key), props))
    }
    return this
  }

  defaultSizes = function() {
    return defaultSizes
  }

  defaultIconCodes = function() {
    return defaultIconCodes
  }

  defaultArrayWidths = function() {
    return defaultArrayWidths
  }

  defaultColors = function() {
    return defaultColors
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

  forNode = (node: any = {}) => {
    const selector = this.nodeSelector(node)
    if ((node.labels != null ? node.labels.length : 0) > 0) {
      this.setDefaultNodeStyling(selector, node)
    }
    return this.calculateStyle(selector)
  }

  forRelationship = (rel: any) => {
    const selector = this.relationshipSelector(rel)
    return this.calculateStyle(selector)
  }
}

export default GraphStyle
