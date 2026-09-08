/**
 * The single source of truth for "where does each character sit on screen".
 *
 * Everything in the app is built on one idea: the page is a fixed grid of
 * character cells (like graph paper). Because we use a monospace font, a
 * character's position is just (row, col) integers -- no pixel measuring.
 *
 * The writing phase uses this to draw text and place the caret.
 * The destruction phase uses this to know what the snake can eat and what
 * the fire can burn. Every destroyer speaks the same coordinate system.
 */

/** How many characters fit on one line. Changing this reflows everything. */
export const COLS = 58

export type Pos = { row: number; col: number }

export type Layout = {
  /** The text broken into display lines, already wrapped. */
  lines: string[]
  /**
   * positions[i] = where character i of the original text is drawn.
   * Has one extra entry at the end: where the caret sits after the last char.
   */
  positions: Pos[]
}

/**
 * Wrap text into fixed-width lines ourselves rather than letting the browser
 * do it. Slightly more code, but it means the writing phase and the
 * destruction phase agree exactly on where every character is.
 */
export function layout(text: string, cols: number = COLS): Layout {
  const positions: Pos[] = []
  const lines: string[] = []
  let line = ''
  let row = 0

  const breakLine = () => {
    lines.push(line)
    line = ''
    row++
  }

  let i = 0
  while (i < text.length) {
    const ch = text[i]

    if (ch === '\n') {
      positions[i] = { row, col: line.length }
      breakLine()
      i++
      continue
    }

    if (ch === ' ') {
      positions[i] = { row, col: line.length }
      // A space that would overflow just ends the line instead of being drawn.
      if (line.length >= cols) breakLine()
      else line += ' '
      i++
      continue
    }

    // Grab the whole word so we can decide to wrap before splitting it.
    let end = i
    while (end < text.length && text[end] !== ' ' && text[end] !== '\n') end++
    const word = text.slice(i, end)

    if (line.length + word.length > cols && line.trim().length > 0) breakLine()

    for (let k = i; k < end; k++) {
      // A word longer than a whole line has to be cut mid-word.
      if (line.length >= cols) breakLine()
      positions[k] = { row, col: line.length }
      line += text[k]
    }
    i = end
  }

  positions[text.length] = { row, col: line.length }
  lines.push(line)
  return { lines, positions }
}

/** One character of the finished text, as something that can be destroyed. */
export type Cell = {
  id: number
  row: number
  col: number
  char: string
}

export type Grid = {
  cols: number
  rows: number
  /** Only non-blank characters. Spaces are empty space the snake can move through. */
  cells: Cell[]
}

export function buildGrid(lines: string[], cols: number = COLS): Grid {
  const cells: Cell[] = []
  let id = 0
  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const char = line[col]
      if (char === ' ') continue
      cells.push({ id: id++, row, col, char })
    }
  })
  return { cols, rows: Math.max(lines.length, 1), cells }
}

/** Key for looking a cell up by position. */
export const posKey = (row: number, col: number) => row * 1000 + col

export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}
