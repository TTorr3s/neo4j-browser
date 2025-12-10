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
/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux'

import { toKeyString } from 'neo4j-arc/common'
import { GraphStyleModel, Selector } from 'neo4j-arc/graph-visualization'

import {
  StyledCaptionSelector,
  StyledCircleSelector,
  StyledInlineList,
  StyledInlineListItem,
  StyledInlineListStylePicker,
  StyledLabelToken,
  StyledPickerListItem,
  StyledPickerSelector,
  StyledTokenRelationshipType
} from './styled'
// eslint-disable-next-line no-restricted-imports
import { GlobalState } from 'shared/globalState'
// eslint-disable-next-line no-restricted-imports
import * as actions from 'shared/modules/grass/grassDuck'

type GrassEditorProps = {
  graphStyleData?: any
  graphStyle?: GraphStyleModel
  update?: any
  selectedLabel?: { label: string; propertyKeys: string[] }
  selectedRelType?: { relType: string; propertyKeys: string[] }
}

export const GrassEditorComponent: React.FC<GrassEditorProps> = ({
  selectedLabel,
  selectedRelType
}) => {
  const dispatch = useDispatch()
  const graphStyleData = useSelector((state: GlobalState) =>
    actions.getGraphStyleData(state)
  )

  const graphStyleRef = useRef<GraphStyleModel>(new GraphStyleModel())

  // Initialize graphStyle with data if available
  useEffect(() => {
    if (graphStyleData) {
      graphStyleRef.current.loadRules(graphStyleData)
    }
  }, [graphStyleData])

  const nodeDisplaySizes = useMemo(() => {
    const sizes: string[] = []
    for (let index = 0; index < 10; index++) {
      sizes.push(`${12 + 2 * index}px`)
    }
    return sizes
  }, [])

  const widths = useMemo(() => {
    const w: string[] = []
    for (let index = 0; index < 10; index++) {
      w.push(`${5 + 3 * index}px`)
    }
    return w
  }, [])

  const sizeLessThan = useCallback(
    (size1: string | undefined, size2: string | undefined): boolean => {
      const size1Numerical = size1 ? parseInt(size1.replace('px', '')) : 0
      const size2Numerical = size2 ? parseInt(size2.replace('px', '')) : 0
      return size1Numerical <= size2Numerical
    },
    []
  )

  const updateStyle = useCallback(
    (selector: Selector, styleProp: any): void => {
      graphStyleRef.current.changeForSelector(selector, styleProp)
      dispatch(actions.updateGraphStyleData(graphStyleRef.current.toSheet()))
    },
    [dispatch]
  )

  const circleSelector = useCallback(
    (
      type: 'color' | 'size',
      styleProps: any,
      styleProvider: any,
      activeProvider: any,
      className: string,
      selector: Selector,
      textProvider = (_: any) => {
        return ''
      }
    ) => {
      return styleProps.map((styleProp: any, i: any) => {
        const onClick = () => {
          updateStyle(selector, styleProp)
        }
        const style = styleProvider(styleProp, i)
        const text = textProvider(styleProp)
        const active = activeProvider(styleProp)
        return (
          <StyledPickerListItem
            className={className}
            key={toKeyString('circle' + i)}
            data-testid={`select-${type}-${i}`}
          >
            <StyledCircleSelector
              className={active ? 'active' : ''}
              style={style}
              onClick={onClick}
            >
              {text}
            </StyledCircleSelector>
          </StyledPickerListItem>
        )
      })
    },
    [updateStyle]
  )

  const colorPicker = useCallback(
    (selector: any, styleForLabel: any) => {
      return (
        <StyledInlineListItem key="color-picker">
          <StyledInlineList>
            <StyledInlineListItem>Color:</StyledInlineListItem>
            {circleSelector(
              'color',
              graphStyleRef.current.defaultColors(),
              (color: any) => {
                return { backgroundColor: color.color }
              },
              (color: any) => {
                return color.color === styleForLabel.get('color')
              },
              'color-picker-item',
              selector
            )}
          </StyledInlineList>
        </StyledInlineListItem>
      )
    },
    [circleSelector]
  )

  const sizePicker = useCallback(
    (selector: Selector, styleForLabel: any) => {
      return (
        <StyledInlineListItem key="size-picker">
          <StyledInlineList data-testid="size-picker">
            <StyledInlineListItem>Size:</StyledInlineListItem>
            {circleSelector(
              'size',
              graphStyleRef.current.defaultSizes(),
              (_size: any, index: any) => {
                return {
                  width: nodeDisplaySizes[index],
                  height: nodeDisplaySizes[index]
                }
              },
              (size: any) => {
                return sizeLessThan(
                  size.diameter,
                  styleForLabel.get('diameter')
                )
              },
              'size-picker-item',
              selector
            )}
          </StyledInlineList>
        </StyledInlineListItem>
      )
    },
    [circleSelector, nodeDisplaySizes, sizeLessThan]
  )

  const widthPicker = useCallback(
    (selector: Selector, styleForItem: any) => {
      const widthSelectors = graphStyleRef.current
        .defaultArrayWidths()
        .map((widthValue: any, i: any) => {
          const onClick = () => {
            updateStyle(selector, widthValue)
          }
          const style = { width: widths[i] }
          const active =
            styleForItem.get('shaft-width') === widthValue['shaft-width']
          return (
            <StyledPickerListItem key={toKeyString('width' + i)}>
              <StyledPickerSelector
                className={active ? 'active' : ''}
                style={style}
                onClick={onClick}
              />
            </StyledPickerListItem>
          )
        })
      return (
        <StyledInlineListItem key="width-picker">
          <StyledInlineList>
            <StyledInlineListItem>Line width:</StyledInlineListItem>
            {widthSelectors}
          </StyledInlineList>
        </StyledInlineListItem>
      )
    },
    [updateStyle, widths]
  )

  const captionPicker = useCallback(
    (
      selector: Selector,
      styleForItem: any,
      propertyKeys: any,
      showTypeSelector = false
    ) => {
      const captionSelector = (
        displayCaption: string,
        captionToSave: string
      ) => {
        const onClick = () => {
          updateStyle(selector, { caption: captionToSave })
        }
        const active = styleForItem.props.caption === captionToSave
        return (
          <StyledPickerListItem key={toKeyString('caption' + displayCaption)}>
            <StyledCaptionSelector
              className={active ? 'active' : ''}
              onClick={onClick}
            >
              {displayCaption}
            </StyledCaptionSelector>
          </StyledPickerListItem>
        )
      }
      const captionSelectors = propertyKeys.map((propKey: any) => {
        return captionSelector(propKey, `{${propKey}}`)
      })
      let typeCaptionSelector = null
      if (showTypeSelector) {
        typeCaptionSelector = captionSelector('<type>', '<type>')
      }
      return (
        <StyledInlineListItem key="caption-picker">
          <StyledInlineList>
            <StyledInlineListItem>Caption:</StyledInlineListItem>
            {captionSelector('<id>', '<id>')}
            {typeCaptionSelector}
            {captionSelectors}
          </StyledInlineList>
        </StyledInlineListItem>
      )
    },
    [updateStyle]
  )

  const stylePicker = useCallback(() => {
    let pickers
    let title
    if (selectedLabel) {
      const labelList = selectedLabel.label !== '*' ? [selectedLabel.label] : []
      const styleForLabel = graphStyleRef.current.forNode({ labels: labelList })
      const inlineStyle = {
        backgroundColor: styleForLabel.get('color'),
        color: styleForLabel.get('text-color-internal'),
        cursor: 'default' as const
      }
      pickers = [
        colorPicker(styleForLabel.selector, styleForLabel),
        sizePicker(styleForLabel.selector, styleForLabel),
        captionPicker(
          styleForLabel.selector,
          styleForLabel,
          selectedLabel.propertyKeys
        )
      ]
      title = (
        <StyledLabelToken style={inlineStyle}>
          {selectedLabel.label || '*'}
        </StyledLabelToken>
      )
    } else if (selectedRelType) {
      const relTypeSelector =
        selectedRelType.relType !== '*' ? { type: selectedRelType.relType } : {}
      const styleForRelType =
        graphStyleRef.current.forRelationship(relTypeSelector)
      const inlineStyle = {
        backgroundColor: styleForRelType.get('color'),
        color: styleForRelType.get('text-color-internal'),
        cursor: 'default' as const
      }
      pickers = [
        colorPicker(styleForRelType.selector, styleForRelType),
        widthPicker(styleForRelType.selector, styleForRelType),
        captionPicker(
          styleForRelType.selector,
          styleForRelType,
          selectedRelType.propertyKeys,
          true
        )
      ]
      title = (
        <StyledTokenRelationshipType style={inlineStyle}>
          {selectedRelType.relType || '*'}
        </StyledTokenRelationshipType>
      )
    } else {
      return null
    }
    return (
      <StyledInlineListStylePicker>
        {title}
        {pickers}
      </StyledInlineListStylePicker>
    )
  }, [
    selectedLabel,
    selectedRelType,
    colorPicker,
    sizePicker,
    captionPicker,
    widthPicker
  ])

  return stylePicker()
}

export const GrassEditor = GrassEditorComponent
