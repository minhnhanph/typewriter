import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COLS, countWords, layout } from '../../core/text'
import { playBell, playStrike } from '../../lib/sound'
import { Paper } from './Paper'
import { Typewriter, type Strike } from './Typewriter'

type Props = {
  text: string
  onChange: (text: string) => void
  onDone: () => void
}

/**
 * Phase 1. A real <textarea> sits invisibly on top of the page and does the
 * unglamorous work -- keyboard, paste, undo, mobile keyboards, accessibility --
 * while we draw the visible text ourselves. That's what gives us control over
 * wrapping, the caret, and the machine animation.
 */
export function WritingPhase({ text, onChange, onDone }: Props) {
  const input = useRef<HTMLTextAreaElement>(null)
  const [caretIndex, setCaretIndex] = useState(text.length)
  const [strike, setStrike] = useState<Strike | null>(null)
  const strikeId = useRef(0)
  const clearStrike = useRef<number | undefined>(undefined)

  const { lines, positions } = useMemo(() => layout(text, COLS), [text])
  const caret = positions[Math.min(caretIndex, positions.length - 1)] ?? { row: 0, col: 0 }
  const words = countWords(text)

  useEffect(() => {
    input.current?.focus()
    return () => window.clearTimeout(clearStrike.current)
  }, [])

  const syncCaret = useCallback(() => {
    setCaretIndex(input.current?.selectionStart ?? 0)
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

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { key } = event
    const isPrintable = key.length === 1
    // Shift animates the machine but makes no sound of its own -- it would
    // double up with the letter keystroke that always follows it.
    const isShift = key === 'Shift'
    if (!isPrintable && !isShift && key !== 'Enter' && key !== 'Backspace') return

    if (key === 'Enter') playBell()
    else if (!isShift) playStrike()

    strikeId.current += 1
    // The raw key, not just printable characters, so the machine can light up
    // its backspace, shift and carriage-return parts too.
    setStrike({ char: key, id: strikeId.current })

    // Let the key pop back up, otherwise it looks stuck down.
    window.clearTimeout(clearStrike.current)
    clearStrike.current = window.setTimeout(() => setStrike(null), 110)
  }, [])

  return (
    <div className="phase phase-writing" onMouseDown={keepFocus}>
      <Paper lines={lines} caret={caret} placeholder="Start typing. No one else will see this." />

      <textarea
        ref={input}
        className="hidden-input"
        value={text}
        spellCheck={false}
        autoCapitalize="sentences"
        aria-label="Write your thoughts"
        onChange={(e) => {
          onChange(e.target.value)
          syncCaret()
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
        onClick={syncCaret}
      />

      <div className="writing-machine">
        <Typewriter strike={strike} col={caret.col} cols={COLS} />
        <div className="writing-actions">
          <span className="word-count">{words === 1 ? '1 word' : `${words} words`}</span>
          <button className="button button-primary" disabled={words === 0} onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
