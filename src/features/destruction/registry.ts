import { fireDestroyer } from './destroyers/fire'
import { snakeDestroyer } from './destroyers/snake'
import type { Destroyer } from './types'

/**
 * Every way of destroying the text, in the order they're offered.
 * Adding a new effect: write the file, add it here. That's the whole change.
 */
export const DESTROYERS: Destroyer[] = [snakeDestroyer, fireDestroyer]

export function findDestroyer(id: string): Destroyer | undefined {
  return DESTROYERS.find((d) => d.id === id)
}
