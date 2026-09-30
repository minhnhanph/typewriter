import type { ComponentType } from 'react'
import type { Grid } from '../../core/text'

export type DestroyerProps = {
  grid: Grid
  /** True when the user can control it (desktop). False = it runs itself. */
  playable: boolean
  /** Call once every character is gone. */
  onComplete: () => void
}

/**
 * The contract every destruction effect implements. A destroyer receives the
 * character grid and is responsible for emptying it, however it likes.
 *
 * This is the extension point of the whole app: a third effect -- a shredder,
 * rain dissolving the ink, a black hole -- is a new file plus one line in the
 * registry. Nothing else changes.
 */
export type Destroyer = {
  id: string
  name: string
  /** One word, printed large on its ticket and on the receipt. */
  short: string
  /** One line on the choose screen. */
  tagline: string
  /** A small line drawing for its ticket. Draw with `currentColor`. */
  Mark: ComponentType
  /** How to operate it, shown while it runs. */
  instructions: { playable: string; watching: string }
  Component: ComponentType<DestroyerProps>
}
