import { useCallback, useEffect, useRef, useState } from 'react'
import { apply, paste as pasteText, type Draft, type Op } from '../../core/sheet'
import { playBell, playClunk, playRatchet, playReturn, playSpace, playStrike } from '../../lib/sound'

/** How long a typebar takes to reach the paper. The letter appears when it lands. */
const STRIKE_DELAY = 80
/** How long a swung bar stays up, matching `.tw-type` in writing.css. */
const SWING_MS = 140
/** More bars than this in the air at once just reads as noise. */
const MAX_SWINGS = 3
/** How long a key stays down when tapped. */
const PRESS_MS = 110
/** Enough undo for a writing session without holding every keystroke forever. */
const HISTORY = 400

export const TYPE_BARS = 11

/** Which bar a character swings. Hashed, so a given letter always uses the same bar. */
export const barFor = (char: string) => (Math.imul(char.charCodeAt(0), 2654435761) >>> 0) % TYPE_BARS

/** How the paper and carriage travel for the last thing that happened. */
export type Motion = 'type' | 'tab' | 'return'
export type Swing = { bar: number; id: number }

type Landing = { at: number; draft: Draft; motion: Motion; after?: () => void }

/**
 * Runs the machine: takes keystrokes, works out what they do, and lands each
 * one on the paper in order and on time.
 *
 * Keystrokes are worked out immediately against a "projected" draft -- the
 * page as it will be once everything in flight has landed -- so the margin
 * stop and the bell are decided the moment a key goes down. The draft itself
 * only changes when the type arrives.
 */
export function useMachine(draft: Draft, onChange: (draft: Draft) => void) {
  const projected = useRef(draft)
  /**
   * Drafts waiting to land, in keystroke order. One queue rather than a timer
   * each: timers with near-equal deadlines can fire out of order, and a fast
   * back spacer would then land before the letter it was meant to remove.
   */
  const queue = useRef<Landing[]>([])
  const flushTimer = useRef<number | undefined>(undefined)
  const history = useRef<Draft[]>([])
  const timers = useRef(new Set<number>())
  const ids = useRef(0)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [motion, setMotion] = useState<Motion>('type')
  const [swings, setSwings] = useState<Swing[]>([])
  const [pressed, setPressed] = useState<{ key: string; id: number } | null>(null)
  /** Every landed strike turns the ribbon spools a little. */
  const [strokes, setStrokes] = useState(0)
  const [shiftHeld, setShiftHeld] = useState(false)
  /** Shift clicked on screen holds for one character. */
  const [shiftSticky, setShiftSticky] = useState(false)

  const later = useCallback((ms: number, fn: () => void) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }, [])

  // The draft can be replaced from outside (a fresh page after destruction).
  // Follow it, but never while our own keystrokes are still landing.
  useEffect(() => {
    if (queue.current.length === 0) projected.current = draft
  }, [draft])

  // Leaving the screen mid-keystroke must not drop the last letters.
  useEffect(() => {
    const live = timers.current
    return () => {
      live.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(flushTimer.current)
      if (queue.current.length > 0) onChangeRef.current(projected.current)
      queue.current = []
    }
  }, [])

  /** Land everything that's due, oldest first, then wait for the next. */
  const flush = useCallback(() => {
    flushTimer.current = undefined
    const now = performance.now()
    while (queue.current.length > 0 && queue.current[0].at <= now + 1) {
      const landing = queue.current.shift()!
      setMotion(landing.motion)
      onChangeRef.current(landing.draft)
      landing.after?.()
    }
    const next = queue.current[0]
    if (next) flushTimer.current = window.setTimeout(flush, next.at - now)
  }, [])

  /** Queue a draft to land after `delay`, never before anything already queued. */
  const enqueue = useCallback(
    (draft: Draft, delay: number, motion: Motion, after?: () => void) => {
      projected.current = draft
      const now = performance.now()
      const last = queue.current[queue.current.length - 1]
      queue.current.push({ at: Math.max(now + delay, last?.at ?? 0), draft, motion, after })
      if (flushTimer.current === undefined) {
        flushTimer.current = window.setTimeout(flush, queue.current[0].at - now)
      }
    },
    [flush],
  )

  const flash = useCallback(
    (key: string) => {
      const id = ++ids.current
      setPressed({ key, id })
      later(PRESS_MS, () => setPressed((p) => (p?.id === id ? null : p)))
    },
    [later],
  )

  /** A change the user made: remembered for undo, then queued to land. */
  const land = useCallback(
    (next: Draft, delay: number, motion: Motion, after: () => void) => {
      history.current = [...history.current.slice(-HISTORY + 1), projected.current]
      enqueue(next, delay, motion, after)
    },
    [enqueue],
  )

  /** One keystroke, from the keyboard or a click on the drawn keys. `key` lights it. */
  const press = useCallback(
    (op: Op, key: string) => {
      if (key) flash(key)
      const before = projected.current
      const { draft: next, outcome, bell } = apply(before, op)

      if (outcome === 'none') return
      if (outcome === 'blocked') {
        playClunk()
        return
      }

      const printed = outcome === 'printed'
      if (printed) {
        const swing = { bar: barFor(op.kind === 'char' ? op.char : ' '), id: ++ids.current }
        // Capped rather than queued: the oldest bar gives way to the newest.
        setSwings((s) => [...s.slice(-(MAX_SWINGS - 1)), swing])
        later(SWING_MS, () => setSwings((s) => s.filter((x) => x.id !== swing.id)))
        setShiftSticky(false)
      }

      const motion: Motion =
        op.kind === 'tab' ? 'tab' : op.kind === 'return' ? 'return' : 'type'

      land(next, printed ? STRIKE_DELAY : 0, motion, () => {
        if (printed) {
          playStrike()
          setStrokes((n) => n + 1)
        } else if (op.kind === 'tab') playRatchet(next.col - before.col)
        else if (op.kind === 'return') playReturn()
        else playSpace()
        if (bell) playBell()
      })
    },
    [flash, land, later],
  )

  const paste = useCallback(
    (text: string) => {
      const next = pasteText(projected.current, text)
      if (next === projected.current) return
      land(next, 0, 'return', playStrike)
    },
    [land],
  )

  /** Not part of the machine -- the one modern kindness. */
  const undo = useCallback(() => {
    const previous = history.current.pop()
    if (previous) enqueue(previous, 0, 'type')
  }, [enqueue])

  const toggleShiftSticky = useCallback(() => setShiftSticky((on) => !on), [])

  return {
    press,
    paste,
    undo,
    motion,
    swings,
    pressed,
    strokes,
    shift: shiftHeld || shiftSticky,
    setShiftHeld,
    toggleShiftSticky,
  }
}
