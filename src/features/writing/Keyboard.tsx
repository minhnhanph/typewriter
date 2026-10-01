import { memo } from 'react'

/**
 * A key is one of three kinds: a character key, a dual-glyph key carrying a
 * shifted alternate, or a function key that moves the machine rather than
 * making a mark.
 */
export type Key = {
  /** Lights the key and identifies it to the click handler. */
  id: string
  /** What's printed on the cap. `\n` splits it over two lines. */
  label: string
  /** The shifted glyph, printed small above the main one. */
  alt?: string
  /** Touch-typing finger number printed above the key. */
  finger?: number
  /** Function keys are the solid dark ones at the ends of the rows. */
  command?: boolean
}

const letters = (chars: string): Key[] => chars.split('').map((c) => ({ id: c, label: c }))

/**
 * Which finger reaches which key, printed above the caps on old teaching
 * charts: index 1 through little finger 4, counting outwards from the middle
 * of the row in both directions.
 */
function addFingerNumbers(keys: Key[]): Key[] {
  return keys.map((key, i) => {
    const fromEdge = Math.min(i, keys.length - 1 - i)
    return { ...key, finger: Math.min(4, Math.max(1, 4 - fromEdge)) }
  })
}

const SHIFT: Key = { id: 'shift', label: 'shift\nkey', command: true, finger: 4 }

/**
 * Four staggered rows, with function keys filling the ends the way they do on
 * a real machine. The number row starts at 2 and ends at the dash, because
 * these machines had no dedicated 1 or 0 -- you typed a lowercase L and a
 * capital O.
 */
export const ROWS: { indent: number; keys: Key[] }[] = [
  {
    indent: 0,
    keys: [
      { id: 'backspace', label: 'back\nspacer', command: true },
      ...addFingerNumbers([
        { id: '2', label: '2', alt: '"' },
        { id: '3', label: '3', alt: '*' },
        { id: '4', label: '4', alt: '$' },
        { id: '5', label: '5', alt: '%' },
        { id: '6', label: '6', alt: '_' },
        { id: '7', label: '7', alt: '&' },
        { id: '8', label: '8', alt: "'" },
        { id: '9', label: '9', alt: '(' },
        { id: '-', label: '-', alt: ')' },
      ]),
      { id: 'tab', label: 'tabular\nkey', command: true },
    ],
  },
  { indent: 1.2, keys: addFingerNumbers(letters('qwertyuiop')) },
  {
    indent: 2.4,
    keys: addFingerNumbers([...letters('asdfghjkl'), { id: ';', label: ';', alt: ':' }]),
  },
  {
    indent: 0.4,
    keys: [
      SHIFT,
      ...addFingerNumbers([...letters('zxcvbnm'), { id: '?', label: '?' }, { id: '/', label: '/' }]),
      SHIFT,
    ],
  },
]

const CHARACTER_KEYS = ROWS.flatMap((row) => row.keys).filter((key) => !key.command)

/** The key a typed character belongs to, so typing on a real keyboard lights the drawn one. */
const KEY_FOR_CHAR = new Map<string, string>()
for (const key of CHARACTER_KEYS) {
  KEY_FOR_CHAR.set(key.label, key.id)
  KEY_FOR_CHAR.set(key.label.toUpperCase(), key.id)
  if (key.alt) KEY_FOR_CHAR.set(key.alt, key.id)
}
export const keyForChar = (char: string) => KEY_FOR_CHAR.get(char) ?? ''

/** What a character key types, with or without Shift. */
export function charFor(id: string, shift: boolean): string {
  const key = CHARACTER_KEYS.find((k) => k.id === id)
  if (!key) return id
  return shift ? (key.alt ?? key.label.toUpperCase()) : key.label
}

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

type Props = {
  /** The id of the key that is down right now. */
  pressed: string
  shift: boolean
  onKey: (id: string) => void
}

/**
 * Drawn the way a mid-century typing manual drew one. Clicking a key does
 * exactly what typing it does. The keys aren't focusable: the hidden input
 * keeps the keyboard focus, and screen readers type through that.
 */
export const Keyboard = memo(function Keyboard({ pressed, shift, onKey }: Props) {
  return (
    <div className="tw-keyboard">
      {ROWS.map((row, r) => (
        <div className="tw-key-row" key={r} style={{ '--indent': row.indent } as React.CSSProperties}>
          {row.keys.map((key, i) => {
            const down = key.id === pressed || (key.id === 'shift' && shift)
            // Shift swaps a dual key to its upper symbol, as the type slug does.
            const swapped = shift && key.alt && !key.command
            return (
              <div
                key={`${key.id}-${i}`}
                className={['tw-key', key.command && 'is-command', down && 'is-pressed']
                  .filter(Boolean)
                  .join(' ')}
                style={arc(i, row.keys.length)}
                onPointerDown={(event) => {
                  if (event.button === 0) onKey(key.id)
                }}
              >
                {key.finger !== undefined && <span className="tw-finger">{key.finger}</span>}
                <span className="tw-cap">
                  {key.alt && !key.command && !swapped && <span className="tw-alt">{key.alt}</span>}
                  {swapped ? (
                    <span className="tw-glyph">{key.alt}</span>
                  ) : (
                    key.label.split('\n').map((line, l) => (
                      <span className="tw-glyph" key={l}>
                        {line}
                      </span>
                    ))
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      <div
        className={`tw-spacebar${pressed === 'space' ? ' is-pressed' : ''}`}
        onPointerDown={(event) => {
          if (event.button === 0) onKey('space')
        }}
      >
        <span>space bar</span>
      </div>
    </div>
  )
})
