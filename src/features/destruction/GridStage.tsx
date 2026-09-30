import type { ReactNode } from 'react'
import type { Grid } from '../../core/text'

type Props = {
  grid: Grid
  className?: string
  children: ReactNode
  onPointerDown?: (pos: { row: number; col: number }) => void
}

/**
 * Sets up the coordinate system destroyers draw into: a fixed grid of
 * character cells sized in `ch` units. Anything inside can be placed with
 * `cellStyle(row, col)` and it lands exactly on a character.
 */
/** Where the typewriter's scale prints a number: 1, every tenth column, the last. */
function rulerMarks(cols: number): number[] {
  const tens = Array.from({ length: Math.floor(cols / 10) }, (_, i) => (i + 1) * 10)
  return [1, ...tens.filter((n) => n < cols - 3), cols]
}

export function GridStage({ grid, className, children, onPointerDown }: Props) {
  return (
    <div
      className={`grid-stage${className ? ` ${className}` : ''}`}
      style={{ '--cols': grid.cols, '--rows': grid.rows } as React.CSSProperties}
      onPointerDown={
        onPointerDown &&
        ((event) => {
          const box = event.currentTarget.getBoundingClientRect()
          const cellW = box.width / grid.cols
          const cellH = box.height / grid.rows
          onPointerDown({
            row: Math.floor((event.clientY - box.top) / cellH),
            col: Math.floor((event.clientX - box.left) / cellW),
          })
        })
      }
    >
      {/* The numbered scale printed on a typewriter above the paper. Part of
          the stage so it shrinks with the grid and every destroyer gets it. */}
      <div className="grid-ruler" aria-hidden="true">
        {rulerMarks(grid.cols).map((n) => (
          <span key={n} className="grid-ruler-mark" style={{ '--col': n - 1 } as React.CSSProperties}>
            <small>{n}</small>
          </span>
        ))}
      </div>
      {children}
    </div>
  )
}

export function cellStyle(row: number, col: number): React.CSSProperties {
  return { '--row': row, '--col': col } as React.CSSProperties
}
