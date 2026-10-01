import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { countWords } from '../../core/text'
import { draftText, type Draft, type Op } from '../../core/sheet'
import { charFor, keyForChar } from './Keyboard'
import { TelegramStrip } from './TelegramStrip'
import { Typewriter } from './Typewriter'
import { useMachine } from './useMachine'

type Props = {
  draft: Draft
  onChange: (draft: Draft) => void
  onDone: () => void
}

/**
 * The hidden input always holds this one character and nothing else. With
 * something to delete, phone keyboards still send their backspace.
 */
const SENTINEL = ' '

/** The function keys, named the way the drawn keyboard names them. */
const FUNCTION_OPS: Record<string, Op> = {
  space: { kind: 'space' },
  backspace: { kind: 'backspace' },
  tab: { kind: 'tab' },
  return: { kind: 'return' },
}

/**
 * Phase 1. An invisible <textarea> keeps the keyboard focus -- for physical
 * keys, phone keyboards, paste and screen readers -- but holds no text. Every
 * keystroke is turned into a machine operation, and the page is drawn from
 * the draft, never from the input.
 */
export function WritingPhase({ draft, onChange, onDone }: Props) {
  const input = useRef<HTMLTextAreaElement>(null)
  const machine = useMachine(draft, onChange)
  const { press, paste, undo, setShiftHeld, shift, toggleShiftSticky } = machine

  const text = useMemo(() => draftText(draft), [draft])
  const words = countWords(text)

  /** Lines rolled back to read earlier text. Anything that lands rolls it home. */
  const [scroll, setScroll] = useState(0)
  useEffect(() => setScroll(0), [draft])
  const scrollBy = useCallback(
    (lines: number) => setScroll((s) => Math.min(draft.line, Math.max(0, s + lines))),
    [draft.line],
  )

  const typeChar = useCallback(
    (char: string) => {
      if (char === '\n') press({ kind: 'return' }, 'return')
      else if (char === ' ') press({ kind: 'space' }, 'space')
      else if (char === '\t') press({ kind: 'tab' }, 'tab')
      else press({ kind: 'char', char }, keyForChar(char))
    },
    [press],
  )

  useEffect(() => {
    input.current?.focus()
  }, [])

  /**
   * Clicking normally moves focus to whatever was clicked. Nothing on this
   * screen is focusable except the hidden input, so the browser would move
   * focus to the page body and typing would silently stop working.
   * Cancelling the default keeps the keyboard pointed at the input.
   */
  const keepFocus = useCallback((event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    input.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const { key } = event
      if (event.metaKey || event.ctrlKey) {
        if (key.toLowerCase() === 'z' && !event.shiftKey) {
          event.preventDefault()
          undo()
        }
        // Everything else (paste, reload, browser shortcuts) passes through.
        return
      }
      if (key === 'Shift') return setShiftHeld(true)
      // Tab is the Tabular key here, so Escape is the way out to Done.
      if (key === 'Escape') return event.currentTarget.blur()
      // The platen knob: read back up the page without moving the carriage.
      const roll = { ArrowUp: 1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[key]
      if (roll) {
        event.preventDefault()
        return scrollBy(roll)
      }

      const op =
        key === 'Backspace'
          ? 'backspace'
          : key === 'Enter'
            ? 'return'
            : key === 'Tab'
              ? 'tab'
              : key === ' '
                ? 'space'
                : null
      if (op) {
        event.preventDefault()
        setScroll(0)
        press(FUNCTION_OPS[op], op)
      } else if (key.length === 1) {
        event.preventDefault()
        setScroll(0)
        typeChar(key)
      }
    },
    [press, typeChar, undo, setShiftHeld, scrollBy],
  )

  // Phone keyboards often don't say which key they pressed; they report what
  // they're about to insert instead. Catch that, act on it, and keep the input
  // holding nothing but the sentinel.
  useEffect(() => {
    const el = input.current
    if (!el) return
    const onBeforeInput = (event: InputEvent) => {
      if (event.isComposing || event.inputType === 'insertCompositionText') return
      event.preventDefault()
      if (event.inputType === 'deleteContentBackward') press({ kind: 'backspace' }, 'backspace')
      else if (event.inputType === 'insertLineBreak' || event.inputType === 'insertParagraph')
        press({ kind: 'return' }, 'return')
      else if (event.data) for (const char of event.data) typeChar(char)
    }
    // Words built up by an input method arrive whole at the end.
    const onCompositionEnd = (event: CompositionEvent) => {
      for (const char of event.data) typeChar(char)
      el.value = SENTINEL
    }
    el.addEventListener('beforeinput', onBeforeInput)
    el.addEventListener('compositionend', onCompositionEnd)
    return () => {
      el.removeEventListener('beforeinput', onBeforeInput)
      el.removeEventListener('compositionend', onCompositionEnd)
    }
  }, [press, typeChar])

  const onKey = useCallback(
    (id: string) => {
      if (id === 'shift') return toggleShiftSticky()
      setScroll(0)
      const op = FUNCTION_OPS[id]
      if (op) press(op, id)
      else typeChar(charFor(id, shift))
    },
    [press, shift, toggleShiftSticky, typeChar],
  )

  return (
    <div className="phase phase-writing" onMouseDown={keepFocus}>
      <TelegramStrip words={words} />

      <textarea
        ref={input}
        className="hidden-input"
        defaultValue={SENTINEL}
        spellCheck={false}
        autoCorrect="off"
        autoComplete="off"
        autoCapitalize="sentences"
        aria-label="Type on the typewriter. Press Escape to leave it."
        aria-describedby="typed-so-far"
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => event.key === 'Shift' && setShiftHeld(false)}
        onBlur={() => setShiftHeld(false)}
        onPaste={(event) => {
          event.preventDefault()
          paste(event.clipboardData.getData('text/plain'))
        }}
      />
      {/* What's on the page, for screen readers -- the drawn paper is decoration to them. */}
      <div id="typed-so-far" className="visually-hidden">
        {text}
      </div>

      <Typewriter
        draft={draft}
        motion={machine.motion}
        swings={machine.swings}
        pressed={machine.pressed?.key ?? ''}
        shift={shift}
        strokes={machine.strokes}
        onKey={onKey}
        scroll={scroll}
        onScroll={scrollBy}
      />

      <div className="writing-actions">
        <button className="button button-primary" disabled={words === 0} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  )
}
