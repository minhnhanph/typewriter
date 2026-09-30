import { useCallback, useMemo, useState } from 'react'
import { COLS, buildGrid, layout } from '../../core/text'
import { useIsTouch } from '../../lib/useIsTouch'
import { findDestroyer } from './registry'

type Props = {
  text: string
  destroyerId: string
  onComplete: () => void
}

/**
 * Phase 2. Turns the finished text into a grid and hands it to whichever
 * destroyer was chosen. This component knows nothing about snakes or fire --
 * that's the point.
 */
export function DestructionPhase({ text, destroyerId, onComplete }: Props) {
  const isTouch = useIsTouch()
  const destroyer = findDestroyer(destroyerId)
  const [destroyed, setDestroyed] = useState(0)

  const grid = useMemo(() => buildGrid(layout(text, COLS).lines, COLS), [text])
  const reportProgress = useCallback((count: number) => setDestroyed(count), [])

  if (!destroyer) return null
  const { Component } = destroyer

  return (
    <div className="phase phase-destroy">
      {/* Ticker tape: the running count and how to operate the destroyer,
          printed the way a telegraph office would print a status line. */}
      <p className="ticker">
        <span>Transmission cancelled</span>
        <span>
          <em>
            {destroyed} / {grid.cells.length}
          </em>{' '}
          characters destroyed
        </span>
        <span>{isTouch ? destroyer.instructions.watching : destroyer.instructions.playable}</span>
      </p>
      <Component
        grid={grid}
        playable={!isTouch}
        onComplete={onComplete}
        onProgress={reportProgress}
      />
    </div>
  )
}
