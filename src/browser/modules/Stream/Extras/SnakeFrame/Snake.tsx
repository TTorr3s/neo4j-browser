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
import React, { useCallback, useEffect, useRef, type JSX } from 'react'
import styled from 'styled-components'

import {
  DOWN,
  LEFT,
  RIGHT,
  UP,
  doesCollide,
  foodColor,
  getInitialState,
  maxSpeed,
  newFood,
  rect,
  snakeColor,
  transitionDirection
} from './helpers'

// Game state type - food is added dynamically by newFood()
type GameState = ReturnType<typeof getInitialState> & {
  food: { x: number; y: number }
}

const SnakeCanvas = styled.canvas`
  border: 1px solid #787878;
  &:focus {
    outline: none;
  }
`

interface SnakeFrameProps {
  play: boolean
  width: number
  height: number
  gridSize: number
  onEat?: (length: number) => void
  onDie?: () => void
}

function SnakeFrame({
  play,
  width,
  height,
  gridSize,
  onEat,
  onDie
}: SnakeFrameProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const gameStateRef = useRef<GameState>(
    getInitialState(play, width, height, gridSize) as GameState
  )
  const blockInputRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)

  // Store callbacks in refs to avoid stale closures in game loop
  const onEatRef = useRef(onEat)
  const onDieRef = useRef(onDie)

  useEffect(() => {
    onEatRef.current = onEat
    onDieRef.current = onDie
  }, [onEat, onDie])

  const drawFood = useCallback(() => {
    const ctx = ctxRef.current
    const gameState = gameStateRef.current
    if (!ctx) return

    ctx.fillStyle = foodColor
    rect({
      ctx,
      x: gameState.food.x,
      y: gameState.food.y,
      width: gameState.snake.width,
      height: gameState.snake.height
    })
  }, [])

  const drawSnake = useCallback(() => {
    const ctx = ctxRef.current
    const gameState = gameStateRef.current
    if (!ctx) return

    ctx.fillStyle = snakeColor
    const { snake } = gameState
    snake.body.forEach((part: { x: number; y: number }) => {
      rect({
        ctx,
        x: part.x,
        y: part.y,
        width: snake.width,
        height: snake.height
      })
    })
  }, [])

  const drawWorld = useCallback(() => {
    const ctx = ctxRef.current
    const gameState = gameStateRef.current
    if (!ctx) return

    const { color, width: worldWidth, height: worldHeight } = gameState.world
    ctx.fillStyle = color
    rect({
      ctx,
      x: 0,
      y: 0,
      width: worldWidth,
      height: worldHeight
    })
  }, [])

  const calcNextHeadPos = useCallback((): { x: number; y: number } => {
    const gameState = gameStateRef.current
    let { x, y } = gameState.snake.body[0]

    if (gameState.snake.direction === UP) {
      y -= gameState.step
      return { x, y }
    }
    if (gameState.snake.direction === DOWN) {
      y += gameState.step
      return { x, y }
    }
    if (gameState.snake.direction === LEFT) {
      x -= gameState.step
      return { x, y }
    }
    if (gameState.snake.direction === RIGHT) {
      x += gameState.step
      return { x, y }
    }
    return { x, y }
  }, [])

  const growSnake = useCallback(() => {
    const gameState = gameStateRef.current
    gameState.snake.body.unshift(gameState.snake.body[0])
  }, [])

  const setNewSpeed = useCallback(() => {
    const gameState = gameStateRef.current
    const speedLen =
      gameState.snake.body.length % 5 ? gameState.speed : gameState.speed - 1
    gameState.speed = Math.max(speedLen, maxSpeed)
  }, [])

  const eatMaybe = useCallback(() => {
    const gameState = gameStateRef.current
    const { x, y } = gameState.snake.body[0]
    const { x: fx, y: fy } = gameState.food

    if (x === fx && y === fy) {
      newFood(gameState)
      growSnake()
      onEatRef.current?.(gameState.snake.body.length)
      setNewSpeed()
    }
  }, [growSnake, setNewSpeed])

  const updateCanvas = useCallback(() => {
    const gameState = gameStateRef.current
    const ctx = ctxRef.current
    const canvas = canvasRef.current

    // Helper to schedule next frame
    const tick = () => {
      gameState.frame++
      animationFrameRef.current = window.requestAnimationFrame(updateCanvas)
    }

    if (gameState.frame % gameState.speed) {
      tick()
      return
    }

    blockInputRef.current = false

    if (!gameState.play) {
      return
    }

    if (!canvas || !ctx) {
      return
    }

    ctx.clearRect(0, 0, gameState.world.width, gameState.world.height)
    drawWorld()

    const { x, y } = calcNextHeadPos()
    if (doesCollide({ x, y }, gameState)) {
      drawFood()
      drawSnake()
      onDieRef.current?.()
      return
    }

    gameState.snake.body.unshift({ x, y })
    gameState.snake.body.pop()
    drawFood()
    drawSnake()
    eatMaybe()
    tick()
  }, [drawWorld, calcNextHeadPos, drawFood, drawSnake, eatMaybe])

  const reset = useCallback(() => {
    gameStateRef.current = getInitialState(
      play,
      width,
      height,
      gridSize
    ) as GameState
  }, [play, width, height, gridSize])

  // Initialize canvas context
  useEffect(() => {
    if (canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d')
    }
  }, [])

  // Handle keyboard input
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleKeyDown = (ev: KeyboardEvent) => {
      const { key } = ev
      if (blockInputRef.current) {
        return
      }

      const allowedKeys: Record<string, string> = {
        ArrowDown: DOWN,
        ArrowUp: UP,
        ArrowLeft: LEFT,
        ArrowRight: RIGHT,
        s: DOWN,
        w: UP,
        a: LEFT,
        d: RIGHT
      }

      if (!Object.keys(allowedKeys).includes(key)) {
        return
      }

      blockInputRef.current = true
      gameStateRef.current.snake.direction = transitionDirection(
        gameStateRef.current.snake.direction,
        allowedKeys[key]
      )
    }

    canvas.addEventListener('keydown', handleKeyDown)
    return () => canvas.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Start game loop on mount
  useEffect(() => {
    updateCanvas()
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [updateCanvas])

  // Handle play prop changes
  useEffect(() => {
    const gameState = gameStateRef.current
    if (gameState.play !== play) {
      gameState.play = play
      if (play) {
        canvasRef.current?.focus()
        reset()
        // Cancel any existing animation frame and start fresh
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        animationFrameRef.current = window.requestAnimationFrame(updateCanvas)
      }
    }
  }, [play, reset, updateCanvas])

  return (
    <SnakeCanvas
      tabIndex={1}
      ref={canvasRef}
      width={gameStateRef.current.world.width}
      height={gameStateRef.current.world.height}
    />
  )
}

export default SnakeFrame
