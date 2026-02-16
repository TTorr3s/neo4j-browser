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
import { Component, ErrorInfo, type JSX, ReactNode } from 'react'
import styled from 'styled-components'

import { StyledErrorBoundaryButton } from 'browser-components/buttons/index'
import { Frame } from 'shared/modules/frames/framesDuck'

const FrameErrorWrapper = styled.div`
  padding: 30px;
  color: ${props => props.theme.primaryText};
`

const FrameErrorTitle = styled.h4`
  color: #da4433;
  margin-bottom: 10px;
`

const FrameErrorMessage = styled.p`
  margin-bottom: 10px;
  font-size: 14px;
`

const FrameErrorCommand = styled.code`
  font-family: ${props => props.theme.editorFont};
  background-color: ${props => props.theme.editorBackground};
  padding: 2px 6px;
  border-radius: 2px;
`

const FrameErrorDetails = styled.pre`
  font-size: 12px;
  color: ${props => props.theme.preText};
  background-color: ${props => props.theme.preBackground};
  padding: 10px;
  border-radius: 2px;
  overflow: auto;
  max-height: 150px;
  margin-bottom: 10px;
`

type FrameErrorBoundaryProps = {
  children: ReactNode
  frame: Frame
}

type FrameErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

class FrameErrorBoundaryClass extends Component<
  FrameErrorBoundaryProps,
  FrameErrorBoundaryState
> {
  constructor(props: FrameErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): FrameErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      'FrameErrorBoundary caught an error in frame:',
      this.props.frame.cmd,
      error,
      errorInfo
    )
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <FrameErrorWrapper>
          <FrameErrorTitle>Something went wrong</FrameErrorTitle>
          <FrameErrorMessage>
            An error occurred while rendering the result for{' '}
            <FrameErrorCommand>{this.props.frame.cmd}</FrameErrorCommand>
          </FrameErrorMessage>
          {this.state.error && (
            <FrameErrorDetails>{this.state.error.toString()}</FrameErrorDetails>
          )}
          <StyledErrorBoundaryButton onClick={this.handleRetry}>
            Retry
          </StyledErrorBoundaryButton>
        </FrameErrorWrapper>
      )
    }

    return this.props.children
  }
}

export default function FrameErrorBoundary(
  props: FrameErrorBoundaryProps
): JSX.Element {
  return (
    <FrameErrorBoundaryClass frame={props.frame}>
      {props.children}
    </FrameErrorBoundaryClass>
  )
}
