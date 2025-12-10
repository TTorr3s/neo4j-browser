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
import React, { useState, useCallback } from 'react'
import styled from 'styled-components'

import FrameBodyTemplate from '../../../Frame/FrameBodyTemplate'
import { PaddedDiv } from '../../styled'
import Score from './Score'
import Snake from './Snake'
import { foodColor, worldColor } from './helpers'
import { FormButton } from 'browser/components/buttons/index'

const width = 600
const height = 300

const GameDiv = styled.div<{ width: number; height: number }>`
  margin: 30px auto;
  width: ${props => props.width}px;
  height: ${props => props.height + 50}px;
`

const SplashScreen = styled(GameDiv)<{ backgroundColor: string }>`
  background-color: ${props => props.backgroundColor};
`

const SplashContents = styled.div`
  height: auto;
  padding: 100px auto;
  text-align: center;
  p {
    color: white;
    margin-top: 10px;
  }
  h2 {
    color: white;
    padding-top: 50px;
  }
  button {
    margin-top: 100px;
  }
`

export const InitialStartButton: any = styled(FormButton)<{
  backgroundColor: string
}>`
  background-color: ${props => props.backgroundColor};
  color: #ffffff;
`

interface SnakeFrameState {
  score: number
  play: boolean
  initialLoad: boolean
}

export function SnakeFrame() {
  const [state, setState] = useState<SnakeFrameState>({
    score: 0,
    play: false,
    initialLoad: true
  })

  const setScore = useCallback((score: number) => {
    setState(prev => ({ ...prev, score: score - 1 }))
  }, [])

  const stop = useCallback(() => {
    setState(prev => ({ ...prev, play: false }))
  }, [])

  const play = useCallback(() => {
    setState({ play: true, score: 0, initialLoad: false })
  }, [])

  const game = (
    <GameDiv
      width={width}
      height={height}
      style={{ display: state.initialLoad ? 'none' : 'block' }}
    >
      <Snake
        play={state.play}
        width={width}
        height={height}
        gridSize={20}
        onEat={setScore}
        onDie={stop}
      />
      <Score
        initialLoad={state.initialLoad}
        playing={state.play}
        score={state.score}
      />
      {!state.play && <FormButton onClick={play}>Start game!</FormButton>}
    </GameDiv>
  )

  const splash = state.initialLoad && (
    <SplashScreen width={width} height={height} backgroundColor={worldColor}>
      <SplashContents>
        <h2>Snake game!</h2>
        <InitialStartButton backgroundColor={foodColor} onClick={play}>
          Start the game!
        </InitialStartButton>
        <p>
          Use <strong>arrow keys</strong> or <strong>a-s-w-d</strong> to control
          the snake.
          <br />
          How much can you eat?
        </p>
      </SplashContents>
    </SplashScreen>
  )

  return (
    <PaddedDiv>
      {game}
      {splash}
    </PaddedDiv>
  )
}

interface FrameProps {
  isCollapsed: boolean
  isFullscreen: boolean
}

const Frame = (props: FrameProps) => {
  return (
    <FrameBodyTemplate
      isCollapsed={props.isCollapsed}
      isFullscreen={props.isFullscreen}
      contents={<SnakeFrame />}
    />
  )
}

export default Frame
