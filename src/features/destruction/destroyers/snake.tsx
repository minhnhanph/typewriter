import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { posKey, type Cell, type Grid } from '../../../core/text'
import { playStrike } from '../../../lib/sound'
import { GridStage, cellStyle } from '../GridStage'
import type { Destroyer, DestroyerProps } from '../types'

type Vec = { row: number; col: number }

const TICK_PLAYED = 105
const TICK_AUTO = 55
/** Grow one segment per this many letters, so the snake doesn't swallow the screen. */
const GROW_EVERY = 4
const MAX_LENGTH = 40
const START_LENGTH = 4
/** Short text still gets a roomy arena to move around in. */
const MIN_ROWS = 14

const DIRECTIONS: Record<string, Vec> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
  w: { row: -1, col: 0 },
  s: { row: 1, col: 0 },
  a: { row: 0, col: -1 },
  d: { row: 0, col: 1 },
}

type GameState = {
  body: Vec[]
  dir: Vec
  queued: Vec[]
  remaining: Map<number, Cell>
  eaten: number
  growth: number
  done: boolean
}

function createGame(grid: Grid, rows: number): GameState {
  const remaining = new Map<number, Cell>()
  for (const cell of grid.cells) remaining.set(posKey(cell.row, cell.col), cell)

  // Far enough in that the whole body starts on the grid, not off the left edge.
  const startRow = rows - 2
  return {
    body: Array.from({ length: START_LENGTH }, (_, i) => ({ row: startRow, col: START_LENGTH - i })),
    dir: { row: 0, col: 1 },
    queued: [],
    remaining,
    eaten: 0,
    growth: 0,
    done: false,
  }
}

/** Shortest signed distance on an axis that wraps around at the edges. */
function wrapDelta(from: number, to: number, size: number): number {
  let delta = to - from
  if (delta > size / 2) delta -= size
  if (delta < -size / 2) delta += size
  return delta
}

/** Watch mode: head straight for whatever letter is closest. */
function autoDirection(state: GameState, rows: number, cols: number): Vec {
  const head = state.body[0]
  let best: { dr: number; dc: number } | null = null
  let bestDistance = Infinity

  for (const cell of state.remaining.values()) {
    const dr = wrapDelta(head.row, cell.row, rows)
    const dc = wrapDelta(head.col, cell.col, cols)
    const distance = Math.abs(dr) + Math.abs(dc)
    if (distance < bestDistance) {
      bestDistance = distance
      best = { dr, dc }
    }
  }

  if (!best) return state.dir
  if (Math.abs(best.dc) >= Math.abs(best.dr) && best.dc !== 0) {
    return { row: 0, col: Math.sign(best.dc) }
  }
  if (best.dr !== 0) return { row: Math.sign(best.dr), col: 0 }
  return state.dir
}

function SnakeStage({ grid, playable, onComplete }: DestroyerProps) {
  const rows = Math.max(grid.rows, MIN_ROWS)
  const arena = useMemo(() => ({ ...grid, rows }), [grid, rows])

  const [auto, setAuto] = useState(!playable)
  const [, render] = useReducer((n: number) => n + 1, 0)

  const game = useRef<GameState | null>(null)
  if (game.current === null) game.current = createGame(grid, rows)

  const autoRef = useRef(auto)
  autoRef.current = auto
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  // Steering. There is no fail state: walls wrap and the snake passes through
  // itself, so the only thing that can happen is finishing.
  useEffect(() => {
    if (auto) return
    const onKeyDown = (event: KeyboardEvent) => {
      const next = DIRECTIONS[event.key]
      if (!next) return
      event.preventDefault()
      const state = game.current!
      const current = state.queued.at(-1) ?? state.dir
      // Ignore a straight reversal -- it reads as a glitch rather than a turn.
      if (next.row === -current.row && next.col === -current.col) return
      if (state.queued.length < 2) state.queued.push(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [auto])

  useEffect(() => {
    const interval = window.setInterval(
      () => {
        const state = game.current!
        if (state.done) return

        if (autoRef.current) state.dir = autoDirection(state, rows, arena.cols)
        else if (state.queued.length) state.dir = state.queued.shift()!

        const head = state.body[0]
        const next = {
          row: (head.row + state.dir.row + rows) % rows,
          col: (head.col + state.dir.col + arena.cols) % arena.cols,
        }
        state.body.unshift(next)

        const key = posKey(next.row, next.col)
        if (state.remaining.has(key)) {
          state.remaining.delete(key)
          state.eaten++
          if (state.eaten % 2 === 0) playStrike()
          if (state.eaten % GROW_EVERY === 0 && state.body.length < MAX_LENGTH) state.growth++
        }

        if (state.growth > 0) state.growth--
        else state.body.pop()

        if (state.remaining.size === 0) {
          state.done = true
          window.setTimeout(() => completeRef.current(), 900)
        }
        render()
      },
      auto ? TICK_AUTO : TICK_PLAYED,
    )
    return () => window.clearInterval(interval)
  }, [auto, rows, arena.cols])

  const state = game.current
  const total = grid.cells.length

  return (
    <>
      <GridStage grid={arena} className="stage-snake">
        {[...state.remaining.values()].map((cell) => (
          <span className="cell" key={cell.id} style={cellStyle(cell.row, cell.col)}>
            {cell.char}
          </span>
        ))}
        {state.body.map((segment, i) => (
          <div
            key={i}
            className={`snake-seg${i === 0 ? ' is-head' : ''}`}
            style={cellStyle(segment.row, segment.col)}
          />
        ))}
      </GridStage>

      <div className="destroy-hud">
        <span className="hud-progress">
          {state.eaten} / {total} eaten
        </span>
        {playable && !auto && (
          <button className="button button-ghost" onClick={() => setAuto(true)}>
            Finish it for me
          </button>
        )}
      </div>
    </>
  )
}

export const snakeDestroyer: Destroyer = {
  id: 'snake',
  name: 'Feed it to the snake',
  tagline: 'Steer. Eat every last letter yourself.',
  instructions: {
    playable: 'Arrow keys or WASD. Walls wrap around. You cannot lose.',
    watching: 'The snake finds its own way through.',
  },
  Component: SnakeStage,
}
