/**
 * The typewriter as data. Everything visible on the writing screen -- the
 * paper's position, the carriage on its rail -- is derived from three things
 * kept here: a grid of typed cells, a current column and a current line.
 *
 * Every function is pure: give it a draft and a keystroke, get the next draft
 * and what the machine did. The writing screen decides when to show it.
 */
import { COLS, layout } from './text'

/**
 * One strike of ink. Its slight variation is fixed at the moment of typing and
 * stored, because ink doesn't change after it dries.
 */
export type Ink = {
  /** The character. */
  c: string
  /** Opacity, 0–1. */
  o: number
  /** Vertical offset, in em. */
  y: number
}

/** One column of one line: a typed letter, or blank paper. */
export type Cell = Ink | null
export type Row = Cell[]

export type Draft = {
  rows: Row[]
  line: number
  col: number
}

/** The bell rings this many columns before the right margin. */
export const BELL_AT = COLS - 7
/** Tab stops, every five columns. */
export const TAB_EVERY = 5

export const emptyDraft = (): Draft => ({ rows: [], line: 0, col: 0 })

/** What the machine did with a keystroke, so the screen can show and sound it. */
export type Outcome =
  /** A character landed on the paper. */
  | 'printed'
  /** The carriage moved without printing: space, back spacer, tab, return. */
  | 'moved'
  /** The right margin stopped it. The key goes down, nothing prints. */
  | 'blocked'
  /** Nothing to do, e.g. back spacer at the very start of the page. */
  | 'none'

export type Result = {
  draft: Draft
  outcome: Outcome
  /** True when this keystroke carried the carriage past the bell point. */
  bell: boolean
}

export type Op =
  | { kind: 'char'; char: string }
  | { kind: 'space' }
  | { kind: 'backspace' }
  | { kind: 'tab' }
  | { kind: 'return' }

const result = (draft: Draft, outcome: Outcome, fromCol = draft.col): Result => ({
  draft,
  outcome,
  bell: fromCol < BELL_AT && draft.col >= BELL_AT,
})

const round = (n: number) => Math.round(n * 100) / 100

/** A little ribbon wear and a little uneven pressure. */
const freshInk = (c: string): Ink => ({
  c,
  o: round(0.8 + Math.random() * 0.2),
  y: round((Math.random() - 0.5) * 0.06),
})

/** Copy-on-write the one cell at the carriage, leaving every other row shared. */
function writeCell(draft: Draft, cell: Cell): Draft {
  const rows = draft.rows.slice()
  while (rows.length <= draft.line) rows.push([])
  const row = rows[draft.line].slice()
  while (row.length < draft.col) row.push(null)
  row[draft.col] = cell
  rows[draft.line] = row
  return { ...draft, rows }
}

/** How far a line has been typed: the column just after its last character. */
function rowEnd(row: Row | undefined): number {
  if (!row) return 0
  for (let col = row.length - 1; col >= 0; col--) if (row[col]) return col + 1
  return 0
}

/** Apply one keystroke. The right margin is a hard stop. */
export function apply(draft: Draft, op: Op): Result {
  switch (op.kind) {
    case 'char': {
      if (draft.col >= COLS) return result(draft, 'blocked')
      const typed = writeCell(draft, freshInk(op.char))
      return result({ ...typed, col: draft.col + 1 }, 'printed', draft.col)
    }

    case 'space': {
      if (draft.col >= COLS) return result(draft, 'blocked')
      return result({ ...draft, col: draft.col + 1 }, 'moved', draft.col)
    }

    case 'tab': {
      if (draft.col >= COLS) return result(draft, 'blocked')
      const next = Math.min(COLS, (Math.floor(draft.col / TAB_EVERY) + 1) * TAB_EVERY)
      return result({ ...draft, col: next }, 'moved', draft.col)
    }

    case 'return':
      return result({ ...draft, line: draft.line + 1, col: 0 }, 'moved')

    case 'backspace': {
      // Erase, and at the start of a line step back up to the end of the one
      // above, so a stray return can be taken back.
      if (draft.col === 0) {
        if (draft.line === 0) return result(draft, 'none')
        const line = draft.line - 1
        return result({ ...draft, line, col: rowEnd(draft.rows[line]) }, 'moved')
      }
      const back = { ...draft, col: draft.col - 1 }
      if (!draft.rows[back.line]?.[back.col]) return result(back, 'moved')
      return result(writeCell(back, null), 'moved')
    }
  }
}

/**
 * Pasted text has no margin bell to listen for, so it is wrapped at word
 * boundaries for you -- otherwise everything past the margin would be lost.
 */
export function paste(draft: Draft, text: string): Draft {
  let next = draft
  const step = (op: Op) => {
    next = apply(next, op).draft
  }
  for (const word of text.replace(/\r\n?/g, '\n').split(/(\s)/)) {
    if (word === '') continue
    if (word === '\n') step({ kind: 'return' })
    else if (/\s/.test(word)) step(next.col >= COLS ? { kind: 'return' } : { kind: 'space' })
    else {
      if (next.col > 0 && next.col + word.length > COLS) step({ kind: 'return' })
      for (const char of word) {
        if (next.col >= COLS) step({ kind: 'return' })
        step({ kind: 'char', char })
      }
    }
  }
  return next
}

/**
 * The draft as plain text, for counting words and for the destroyers. Every
 * line is at most COLS wide, so `layout()` lays it out exactly as typed.
 */
export function draftText(draft: Draft): string {
  return draft.rows
    .map((row) => row.map((cell) => cell?.c ?? ' ').join('').trimEnd())
    .join('\n')
    .replace(/\s+$/, '')
}

/** Turn older plain-text drafts into a page, so nobody loses words on update. */
export function draftFromText(text: string): Draft {
  const { lines, positions } = layout(text, COLS)
  const rows: Row[] = lines.map((line) => line.split('').map((c) => (c === ' ' ? null : { c, o: 1, y: 0 })))
  const end = positions[text.length] ?? { row: 0, col: 0 }
  return { rows, line: end.row, col: end.col }
}

/** Accept only something shaped like a draft; anything else starts fresh. */
export function isDraft(value: unknown): value is Draft {
  const d = value as Draft
  return (
    !!d &&
    Array.isArray(d.rows) &&
    d.rows.every(Array.isArray) &&
    Number.isInteger(d.line) &&
    Number.isInteger(d.col)
  )
}
