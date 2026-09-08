import { useMemo } from 'react'
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

  const grid = useMemo(() => buildGrid(layout(text, COLS).lines, COLS), [text])

  if (!destroyer) return null
  const { Component } = destroyer

  return (
    <div className="phase phase-destroy">
      <p className="destroy-instructions">
        {isTouch ? destroyer.instructions.watching : destroyer.instructions.playable}
      </p>
      <Component grid={grid} playable={!isTouch} onComplete={onComplete} />
    </div>
  )
}
