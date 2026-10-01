import { useState } from 'react'
import { countWords } from '../../core/text'
import { TelegramStrip } from '../writing/TelegramStrip'
import { LetterSheet } from './LetterSheet'
import { TypedLetter } from './TypedLetter'

type Props = {
  /** The letter, already laid out to the page width. */
  text: string
  onRead: () => void
}

type View = 'letter' | 'typewriter'

const VIEWS: { id: View; label: string }[] = [
  { id: 'letter', label: 'Letter' },
  { id: 'typewriter', label: 'Typewriter' },
]

/**
 * The friend's side of a sent letter. It opens on the whole letter, and can
 * be switched to watch it typed out on the machine.
 *
 * The page lives only in memory -- it is never saved to the friend's browser.
 * The letter exists in the link and nowhere else.
 */
export function ReadingPhase({ text, onRead }: Props) {
  const [view, setView] = useState<View>('letter')

  const switcher = (
    <div className="view-switch" role="group" aria-label="How to read it">
      {VIEWS.map(({ id, label }) => (
        <button
          key={id}
          className="view-switch-option"
          aria-pressed={view === id}
          onClick={() => setView(id)}
        >
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div className={`phase phase-writing phase-reading is-${view}`}>
      <TelegramStrip title="Incoming" timeLabel="Received" words={countWords(text)} />

      {/* The whole letter at once for screen readers; the page is decoration to them. */}
      <div className="visually-hidden">{text}</div>

      {view === 'letter' ? (
        <LetterSheet text={text} onRead={onRead} switcher={switcher} />
      ) : (
        <TypedLetter text={text} onRead={onRead} switcher={switcher} />
      )}
    </div>
  )
}
