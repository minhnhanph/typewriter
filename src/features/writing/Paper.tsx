import { memo } from 'react'
import { COLS } from '../../core/text'
import type { Row } from '../../core/sheet'
import type { Motion } from './useMachine'

/** Blank paper around the typing area, in characters. */
const PAD_COLS = 4
/** Blank paper above the first line, in lines. */
const PAD_LINES = 2
/** The paper always shows at least this much below the typing. */
const MIN_LINES = 12

type Props = {
  rows: Row[]
  line: number
  col: number
  motion: Motion
  /** Lines rolled back to read earlier text. 0 is the line being typed. */
  scroll: number
  placeholder?: string
}

/**
 * One typed line. Memoised on the row itself: typing only ever replaces the
 * row being typed on, so every other line skips re-rendering.
 */
const PaperRow = memo(function PaperRow({ row, index }: { row: Row; index: number }) {
  return (
    <div className="paper-row" style={{ '--row': index } as React.CSSProperties}>
      {row.map(
        (ink, col) =>
          ink && (
            <span
              key={col}
              className="paper-ink"
              style={{ '--col': col, '--ink': ink.o, '--dy': `${ink.y}em` } as React.CSSProperties}
            >
              {ink.c}
            </span>
          ),
      )}
    </div>
  )
})

/**
 * The sheet in the machine. The printing point never moves: the paper slides
 * left as you type and up as you return, by one transform computed from the
 * current column and line. Being derived rather than animated on its own, it
 * can't fall out of step with the carriage however fast anyone types.
 */
export function Paper({ rows, line, col, motion, scroll, placeholder }: Props) {
  const isEmpty = rows.every((row) => !row.some(Boolean))
  const lines = Math.max(rows.length, line + 1) + MIN_LINES

  return (
    <div
      className={`paper-sheet is-${scroll > 0 ? 'scrolling' : motion}`}
      style={
        {
          '--cols': COLS,
          '--pad-cols': PAD_COLS,
          '--pad-lines': PAD_LINES,
          '--lines': lines,
          '--line': line,
          '--col': col,
          '--scroll': scroll,
        } as React.CSSProperties
      }
    >
      {isEmpty && placeholder && <p className="paper-placeholder">{placeholder}</p>}
      <div className="paper-type">
        {rows.map((row, index) => (
          <PaperRow key={index} row={row} index={index} />
        ))}
      </div>
    </div>
  )
}
