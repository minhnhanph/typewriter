import { useEffect, useMemo, useRef } from 'react'
import { COLS } from '../../core/text'
import { emptyDraft, paste } from '../../core/sheet'
import { PaperRow } from '../writing/Paper'

type Props = {
  /** The letter, already laid out to the page width. */
  text: string
  onRead: () => void
  /** The view switch, shown beside the buttons. */
  switcher: React.ReactNode
}

/** Blank paper around the letter, matching the sheet in the machine. */
const PAD_COLS = 4
const PAD_LINES = 2

/**
 * The whole letter at once, on a sheet taken out of the machine. Laid out by
 * the same keystrokes as the typewriter, so it's the same page, ink variation
 * and all -- just still.
 */
export function LetterSheet({ text, onRead, switcher }: Props) {
  const rows = useMemo(() => paste(emptyDraft(), text).rows, [text])
  const scroller = useRef<HTMLDivElement>(null)

  // Focused so the arrow keys and Page Up/Down scroll a long letter.
  useEffect(() => {
    scroller.current?.focus({ preventScroll: true })
  }, [])

  return (
    <>
      <div className="letter-view" ref={scroller} tabIndex={-1}>
        <div
          className="letter-page"
          aria-hidden="true"
          style={
            {
              '--cols': COLS,
              '--pad-cols': PAD_COLS,
              '--pad-lines': PAD_LINES,
              '--lines': rows.length,
            } as React.CSSProperties
          }
        >
          <div className="paper-type">
            {rows.map((row, index) => (
              <PaperRow key={index} row={row} index={index} />
            ))}
          </div>
        </div>
      </div>

      <div className="writing-actions reading-actions">
        {switcher}
        <button className="button button-primary" onClick={onRead}>
          Done reading
        </button>
      </div>
    </>
  )
}
