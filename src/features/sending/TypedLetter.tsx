import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyDraft, type Draft } from '../../core/sheet'
import { keyForChar } from '../writing/Keyboard'
import { Typewriter } from '../writing/Typewriter'
import { useMachine } from '../writing/useMachine'

type Props = {
  /** The letter, already laid out to the page width. */
  text: string
  onRead: () => void
  /** The view switch, shown beside the buttons. */
  switcher: React.ReactNode
}

/** A beat before the first key, so the machine is on screen before it moves. */
const START_PAUSE = 900
/** A brisk typist, a little uneven. */
const charDelay = () => 45 + Math.random() * 40
const SPACE_DELAY = 90
const RETURN_DELAY = 420

/**
 * The letter typing itself out on the same machine, through the same
 * keystrokes, so it arrives the way it was written. Any key, a click on the
 * page, or Skip lands the rest at once. Starts from the top every time it's
 * shown.
 */
export function TypedLetter({ text, onRead, switcher }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const { press, paste, motion, swings, pressed, strokes } = useMachine(draft, setDraft)
  const typed = useRef(0)
  const [finished, setFinished] = useState(false)

  const [scroll, setScroll] = useState(0)
  useEffect(() => setScroll(0), [draft])
  const scrollBy = useCallback(
    (lines: number) => setScroll((s) => Math.min(draft.line, Math.max(0, s + lines))),
    [draft.line],
  )

  useEffect(() => {
    let timer: number | undefined
    const step = () => {
      const i = typed.current
      if (i >= text.length) {
        timer = window.setTimeout(() => setFinished(true), 600)
        return
      }
      const char = text[i]
      typed.current = i + 1
      if (char === '\n') press({ kind: 'return' }, 'return')
      else if (char === ' ') press({ kind: 'space' }, 'space')
      else press({ kind: 'char', char }, keyForChar(char))
      timer = window.setTimeout(
        step,
        char === '\n' ? RETURN_DELAY : char === ' ' ? SPACE_DELAY : charDelay(),
      )
    }
    timer = window.setTimeout(step, START_PAUSE)
    return () => window.clearTimeout(timer)
  }, [text, press])

  const skip = useCallback(() => {
    const rest = text.slice(typed.current)
    if (!rest) return
    typed.current = text.length
    paste(rest)
  }, [text, paste])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // The platen knob still rolls the page back to read.
      const roll = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[event.key]
      if (roll) {
        event.preventDefault()
        return scrollBy(roll)
      }
      // Enter and Space belong to whichever button has focus.
      if ((event.target as HTMLElement).closest('button')) return
      skip()
    }
    // Any click on the page skips too, except on a button.
    const onClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('button')) skip()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('click', onClick)
    }
  }, [skip, scrollBy])

  return (
    <>
      <Typewriter
        draft={draft}
        motion={motion}
        swings={swings}
        pressed={pressed?.key ?? ''}
        shift={false}
        strokes={strokes}
        onKey={skip}
        scroll={scroll}
        onScroll={scrollBy}
      />

      <div className="writing-actions reading-actions">
        {switcher}
        {finished ? (
          <button className="button button-primary" onClick={onRead}>
            Done reading
          </button>
        ) : (
          <button className="button button-ghost" onClick={skip}>
            Skip ahead
          </button>
        )}
      </div>
    </>
  )
}
