import { useRef } from 'react'
import { COLS } from '../../core/text'
import { BELL_AT, type Draft } from '../../core/sheet'
import { Keyboard } from './Keyboard'
import { Paper } from './Paper'
import { TYPE_BARS, type Motion, type Swing } from './useMachine'

/** Where the carriage sits on its rail, 0 at the left end to 1 at the right. */
const railAt = (col: number) => 1 - Math.min(col, COLS) / COLS

type Props = {
  draft: Draft
  motion: Motion
  swings: Swing[]
  pressed: string
  shift: boolean
  strokes: number
  onKey: (id: string) => void
  /** Lines rolled back to read earlier text. */
  scroll: number
  /** Roll the paper by this many lines; positive shows earlier text. */
  onScroll: (lines: number) => void
}

/** The height of one typed line in pixels, read from the page itself. */
const lineHeight = (window: HTMLElement) =>
  window.querySelector<HTMLElement>('.paper-row')?.offsetHeight || 28

/**
 * A drawn typewriter rather than a rendered one: flat shapes and heavy
 * outlines, in the style of a mid-century typing-manual diagram. Stacked on
 * one centre line as on a real machine: the paper rising out of the top, then
 * the platen and carriage, ribbon, typebasket, keyboard.
 *
 * It only draws. Every position in it comes from the draft's column and line.
 */
export function Typewriter({
  draft,
  motion,
  swings,
  pressed,
  shift,
  strokes,
  onKey,
  scroll,
  onScroll,
}: Props) {
  const touchY = useRef<number | null>(null)
  const { line, col } = draft
  const spool = { '--turn': `${strokes * 9}deg` } as React.CSSProperties

  return (
    <div className="typewriter" style={{ '--cols': COLS } as React.CSSProperties}>
      {/* --- paper --- */}
      {/* The sheet rises out of the machine above everything else, as it does
          on a real one. Wheel, trackpad or a finger drag rolls it back, like
          turning the platen knob; the next keystroke rolls it home again. */}
      <div
        className="tw-window tw-wide"
        onWheel={(event) => {
          const lines = event.deltaMode === 1 ? event.deltaY : event.deltaY / lineHeight(event.currentTarget)
          onScroll(-lines)
        }}
        onTouchStart={(event) => {
          touchY.current = event.touches[0].clientY
        }}
        onTouchMove={(event) => {
          const y = event.touches[0].clientY
          if (touchY.current !== null) onScroll((y - touchY.current) / lineHeight(event.currentTarget))
          touchY.current = y
        }}
        onTouchEnd={() => {
          touchY.current = null
        }}
      >
        <Paper
          rows={draft.rows}
          line={line}
          col={col}
          motion={motion}
          scroll={scroll}
          placeholder="Start typing. No one else will see this."
        />
        <span className="tw-printing-point" aria-hidden="true" />
      </div>

      {/* --- carriage: the platen with its knobs and return lever, and the
          rail under it carrying the margin stops and bell --- */}
      <div className="tw-carriage-assembly tw-wide" aria-hidden="true">
        <div
          className={`tw-lever${motion === 'return' ? ' is-returning' : ''}`}
          // Remounting on each return restarts the swing.
          key={motion === 'return' ? `lever-${line}` : 'lever'}
          title="Return lever"
          onPointerDown={(event) => {
            if (event.button === 0) onKey('return')
          }}
        />
        <div className="tw-knob" />
        <div className="tw-platen" />
        <div className="tw-knob" />
        <div className="tw-rail">
          <span className="tw-stop" style={{ '--at': railAt(0) } as React.CSSProperties} />
          <span className="tw-stop" style={{ '--at': railAt(COLS) } as React.CSSProperties} />
          <span
            className={`tw-bell${col >= BELL_AT ? ' is-rung' : ''}`}
            style={{ '--at': railAt(BELL_AT) } as React.CSSProperties}
          />
          <div className={`tw-carriage is-${motion}`} style={{ '--at': railAt(col) } as React.CSSProperties} />
        </div>
        {/* Outside the paper window, so its fade can't swallow it. */}
        {scroll > 0 && <span className="tw-scroll-hint fine-print">Rolled back · type to return</span>}
      </div>

      {/* --- ribbon --- */}
      <div className={`tw-ribbon tw-wide${swings.length ? ' is-lifted' : ''}`} aria-hidden="true">
        <span className="tw-spool" style={spool} />
        <span className="tw-ribbon-tape" />
        <span className="tw-ribbon-guide" />
        <span className="tw-spool" style={spool} />
      </div>

      <div className="tw-body" aria-hidden="true">
        {/* --- typebasket --- */}
        <div className={`tw-basket${shift ? ' is-shifted' : ''}`}>
          <div className="tw-segment" />
          {Array.from({ length: TYPE_BARS }, (_, i) => {
            const swing = swings.find((s) => s.bar === i)
            return (
              <div
                key={i}
                className="tw-bar"
                style={{ '--index': i - (TYPE_BARS - 1) / 2 } as React.CSSProperties}
              >
                {/* Remounting on each strike restarts the swing cleanly. */}
                <span key={swing?.id ?? 'rest'} className={`tw-type${swing ? ' is-striking' : ''}`} />
              </div>
            )
          })}
        </div>

        <Keyboard pressed={pressed} shift={shift} onKey={onKey} />
      </div>
    </div>
  )
}
