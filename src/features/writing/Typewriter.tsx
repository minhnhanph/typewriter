import { memo } from 'react'

/** A keystroke to react to. `id` increments so repeats of the same key retrigger. */
export type Strike = { char: string; id: number }

type Props = {
  strike: Strike | null
  /** Column the caret is on, used to slide the carriage. */
  col: number
  cols: number
}

const TYPE_BARS = 21

type Key = {
  /** What's printed on the cap. `\n` splits it over two lines. */
  label: string
  /** The smaller glyph printed above the main one, as on a real number row. */
  alt?: string
  /** Touch-typing finger number printed above the key. */
  finger?: number
  /** The keyboard key that lights it up, lowercased. Omitted = decorative. */
  match?: string
  /** Command keys are the solid dark ones at the ends of the rows. */
  command?: boolean
}

const letters = (chars: string): Key[] => chars.split('').map((c) => ({ label: c, match: c }))

/**
 * Which finger reaches which key, printed above the caps on old teaching
 * charts: index 1 through little finger 4, counting outwards from the middle
 * of the row in both directions.
 */
function addFingerNumbers(keys: Key[]): Key[] {
  const typing = keys.filter((k) => !k.command)
  return keys.map((key) => {
    if (key.command) return key
    const i = typing.indexOf(key)
    const fromEdge = Math.min(i, typing.length - 1 - i)
    return { ...key, finger: Math.min(4, Math.max(1, 4 - fromEdge)) }
  })
}

const SHIFT: Key = { label: 'shift\nkey', match: 'shift', command: true, finger: 4 }

/**
 * Four staggered rows, with command keys filling the ends the way they do on a
 * real machine. The number row starts at 2 and ends at the dash, because these
 * machines had no dedicated 1 or 0 -- you typed a lowercase L and a capital O.
 */
const ROWS: { indent: number; keys: Key[] }[] = [
  {
    indent: 0,
    keys: [
      { label: 'back\nspacer', match: 'backspace', command: true },
      ...addFingerNumbers([
        { label: '2', alt: '"', match: '2' },
        { label: '3', alt: '*', match: '3' },
        { label: '4', alt: '$', match: '4' },
        { label: '5', alt: '%', match: '5' },
        { label: '6', alt: '_', match: '6' },
        { label: '7', alt: '&', match: '7' },
        { label: '8', alt: "'", match: '8' },
        { label: '9', alt: '(', match: '9' },
        { label: '-', alt: ')', match: '-' },
      ]),
      { label: 'tabular\nkey', match: 'tab', command: true },
    ],
  },
  { indent: 1.2, keys: addFingerNumbers(letters('qwertyuiop')) },
  {
    indent: 2.4,
    keys: addFingerNumbers([...letters('asdfghjkl'), { label: ';', alt: ':', match: ';' }]),
  },
  {
    indent: 0.4,
    keys: [
      SHIFT,
      ...addFingerNumbers([
        ...letters('zxcvbnm'),
        { label: '?', match: '?' },
        { label: '/', match: '/' },
      ]),
      SHIFT,
    ],
  },
]

/**
 * The keys sit on a shallow arc -- the ones at the ends of a row ride a little
 * higher and tilt outwards. It's a small thing, but a perfectly straight row of
 * circles reads as a calculator, and this is most of what makes it read as a
 * typewriter instead.
 */
function arc(index: number, count: number) {
  const centre = (count - 1) / 2
  const offset = centre === 0 ? 0 : (index - centre) / centre
  return {
    // Measured in key widths rather than pixels, so the arc keeps its shape
    // when `--key` changes the size of the whole keyboard.
    '--lift': `calc(${-(offset * offset) * 0.33} * var(--key))`,
    '--tilt': `${offset * 3}deg`,
  } as React.CSSProperties
}

/**
 * A drawn typewriter rather than a rendered one: flat shapes and heavy
 * outlines, in the style of a mid-century typing-manual diagram. A platen that
 * tracks the caret, a basket of type bars where one swings up on each
 * keystroke, and a keyboard that depresses the key you actually pressed.
 *
 * It's deliberately a pure display component -- it receives keystrokes and
 * animates. It never touches the text.
 */
export const Typewriter = memo(function Typewriter({ strike, col, cols }: Props) {
  const pressed = strike?.char.toLowerCase() ?? ''
  // Spread strikes across the bars so repeated typing looks mechanical, not looped.
  const activeBar = strike ? strike.char.charCodeAt(0) % TYPE_BARS : -1
  const returning = strike?.char === 'Enter'

  return (
    <div className="typewriter" aria-hidden="true">
      <div className="tw-platen">
        <div
          className={`tw-lever${returning ? ' is-returning' : ''}`}
          key={`lever-${returning ? strike?.id : 'idle'}`}
        />
        <div className="tw-knob" />
        <div className="tw-rail">
          <div
            className="tw-carriage"
            style={{ '--progress': Math.min(col / cols, 1) } as React.CSSProperties}
          />
        </div>
        <div className="tw-knob" />
      </div>

      <div className="tw-basket">
        <div className="tw-segment" />
        {Array.from({ length: TYPE_BARS }, (_, i) => (
          <div
            // Remounting on each strike restarts the CSS animation cleanly.
            key={i === activeBar ? `${i}-${strike?.id}` : i}
            className={`tw-bar${i === activeBar ? ' is-striking' : ''}`}
            style={{ '--index': i - (TYPE_BARS - 1) / 2 } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="tw-keyboard">
        {ROWS.map((row, r) => (
          <div
            className="tw-key-row"
            key={r}
            style={{ '--indent': row.indent } as React.CSSProperties}
          >
            {row.keys.map((key, i) => (
              <div
                key={`${key.label}-${i}`}
                className={[
                  'tw-key',
                  key.command ? 'is-command' : '',
                  key.match && key.match === pressed ? 'is-pressed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={arc(i, row.keys.length)}
              >
                {key.finger !== undefined && <span className="tw-finger">{key.finger}</span>}
                <span className="tw-cap">
                  {key.alt && <span className="tw-alt">{key.alt}</span>}
                  {key.label.split('\n').map((line, l) => (
                    <span className="tw-glyph" key={l}>
                      {line}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}

        <div className={`tw-spacebar${pressed === ' ' ? ' is-pressed' : ''}`}>
          <span>space bar</span>
        </div>
      </div>
    </div>
  )
})
