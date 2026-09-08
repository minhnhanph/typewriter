import { useEffect, useReducer, useRef } from 'react'
import { posKey, type Cell } from '../../../core/text'
import { GridStage, cellStyle } from '../GridStage'
import type { Destroyer, DestroyerProps } from '../types'

const TICK = 70
/**
 * How many ticks a patch of page stays alight. Only the first few are hot --
 * the rest is the char mark cooling and fading, which is what makes the page
 * look burnt rather than blank.
 */
const FLAME_LIFE = 10
/** How long a patch burns hot, before it's just a fading scorch. */
const HEAT_LIFE = 5
/** A flame only spreads while it's young, which keeps a defined burn front. */
const SPREAD_WHILE = 3
/** How many ticks a letter burns before it turns to ash. */
const BURN_TICKS = 4
/** How long ash lingers before the draught takes it. */
const ASH_TICKS = 6

/**
 * Fire climbs. Sideways is slower, downward slower still -- that asymmetry is
 * most of what makes it read as fire rather than a spreading stain.
 */
const SPREAD = { up: 0.5, side: 0.34, down: 0.1, diagonal: 0.28 }

type LetterPhase = 'intact' | 'burning' | 'ash'
type Letter = { cell: Cell; phase: LetterPhase; age: number }
type Flame = { row: number; col: number; age: number }

type Model = {
  letters: Map<number, Letter>
  flames: Map<number, Flame>
  /** Places that have already burned, so the fire doesn't loop back over them. */
  spent: Set<number>
}

/**
 * Set one spot of the page alight, and any letter sitting on it.
 *
 * Every ignition goes through here -- the opening sparks, the spreading front,
 * clicks, and the stall recovery. When seeding skipped this and wrote to
 * `flames` directly, a spark landing on a letter left that letter untouched
 * while marking its spot as already burned, making it impossible to ever ignite
 * and hanging the whole phase.
 */
function lightAt(model: Model, rows: number, cols: number, row: number, col: number, force = false) {
  if (row < 0 || col < 0 || row >= rows || col >= cols) return
  const key = posKey(row, col)
  if (force) model.spent.delete(key)
  if (model.flames.has(key) || model.spent.has(key)) return

  model.flames.set(key, { row, col, age: 0 })
  const letter = model.letters.get(key)
  if (letter && letter.phase === 'intact') {
    letter.phase = 'burning'
    letter.age = 0
  }
}

/**
 * Fire burns the *page*, not the letters.
 *
 * The obvious version -- letters igniting their neighbouring letters -- looks
 * wrong and behaves worse: a space between two words is a gap with no letter
 * in it, so the flame front can never cross one. It stalls constantly.
 *
 * So the flame front lives on the full rectangle of the page, blank cells
 * included, and a letter catches when the fire reaches the spot it's sitting on.
 */
function FireStage({ grid, onComplete }: DestroyerProps) {
  const [, render] = useReducer((n: number) => n + 1, 0)
  const model = useRef<Model | null>(null)

  if (model.current === null) {
    const letters = new Map<number, Letter>()
    for (const cell of grid.cells) {
      letters.set(posKey(cell.row, cell.col), { cell, phase: 'intact', age: 0 })
    }
    const next: Model = { letters, flames: new Map(), spent: new Set() }
    // Catch along the bottom edge and climb up through the text.
    for (let i = 0; i < 4; i++) {
      const col = Math.floor(Math.random() * grid.cols)
      lightAt(next, grid.rows, grid.cols, grid.rows - 1, col)
    }
    model.current = next
  }

  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    let finished = false
    const light = (row: number, col: number, force = false) =>
      lightAt(model.current!, grid.rows, grid.cols, row, col, force)

    const interval = window.setInterval(() => {
      if (finished) return
      const { letters, flames, spent } = model.current!

      const front: Flame[] = []
      for (const [key, flame] of flames) {
        flame.age++
        if (flame.age >= FLAME_LIFE) {
          flames.delete(key)
          spent.add(key)
        } else if (flame.age <= SPREAD_WHILE) {
          front.push(flame)
        }
      }

      for (const { row, col } of front) {
        if (Math.random() < SPREAD.up) light(row - 1, col)
        if (Math.random() < SPREAD.side) light(row, col - 1)
        if (Math.random() < SPREAD.side) light(row, col + 1)
        if (Math.random() < SPREAD.down) light(row + 1, col)
        // Diagonals stop the burn front looking like a rectangle.
        if (Math.random() < SPREAD.diagonal) light(row - 1, col - 1)
        if (Math.random() < SPREAD.diagonal) light(row - 1, col + 1)
      }

      for (const [key, letter] of letters) {
        if (letter.phase === 'intact') continue
        letter.age++
        if (letter.phase === 'burning' && letter.age >= BURN_TICKS) {
          letter.phase = 'ash'
          letter.age = 0
        } else if (letter.phase === 'ash' && letter.age >= ASH_TICKS) {
          letters.delete(key)
        }
      }

      if (letters.size === 0) {
        finished = true
        window.setTimeout(() => completeRef.current(), 700)
      } else if (flames.size === 0) {
        // Everything's gone out but words are still standing. Rather than
        // stall, drop fresh sparks on the survivors -- a few at a time, so the
        // last scraps catching still feels like fire and not a countdown.
        // `force` clears the burned-out marker in case the spot was skipped.
        let sparks = 0
        for (const letter of letters.values()) {
          if (letter.phase !== 'intact') continue
          light(letter.cell.row, letter.cell.col, true)
          if (++sparks >= 3) break
        }
      }
      render()
    }, TICK)

    return () => window.clearInterval(interval)
  }, [grid.rows, grid.cols])

  const { letters, flames } = model.current
  const remaining = [...letters.values()]
  const burnt = grid.cells.length - remaining.filter((l) => l.phase === 'intact').length

  return (
    <>
      <GridStage
        grid={grid}
        className="stage-fire"
        onPointerDown={({ row, col }) => {
          // Let people choose where it catches.
          lightAt(model.current!, grid.rows, grid.cols, row, col, true)
          render()
        }}
      >
        {/* The fire itself, drawn over blank page as well as over letters.
            The layer is blurred as a whole so neighbouring cells melt into one
            burn front instead of reading as a row of separate orange pills. */}
        <div className="flame-layer">
          {[...flames.values()].map((flame) => (
            <span
              key={posKey(flame.row, flame.col)}
              className="flame"
              style={
                {
                  ...cellStyle(flame.row, flame.col),
                  '--heat': Math.max(0, 1 - flame.age / HEAT_LIFE),
                  '--scorch': 1 - flame.age / FLAME_LIFE,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        {remaining.map((letter) => (
          <span
            key={letter.cell.id}
            className={`cell cell-${letter.phase}`}
            style={cellStyle(letter.cell.row, letter.cell.col)}
          >
            {letter.cell.char}
          </span>
        ))}
      </GridStage>

      <div className="destroy-hud">
        <span className="hud-progress">
          {burnt} / {grid.cells.length} burned
        </span>
      </div>
    </>
  )
}

export const fireDestroyer: Destroyer = {
  id: 'fire',
  name: 'Give it to the fire',
  tagline: 'Sit back. Watch it climb the page.',
  instructions: {
    playable: 'Click anywhere to drop another spark.',
    watching: 'Tap anywhere to drop another spark.',
  },
  Component: FireStage,
}
