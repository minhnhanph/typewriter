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
      {children}
    </div>
  )
}

export function cellStyle(row: number, col: number): React.CSSProperties {
  return { '--row': row, '--col': col } as React.CSSProperties
}
