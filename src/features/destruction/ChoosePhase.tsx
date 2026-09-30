import { DESTROYERS } from './registry'

type Props = {
  words: number
  onChoose: (id: string) => void
  onBack: () => void
}

/**
 * The commitment screen. Deliberately quiet -- this is the moment the words
 * stop being a draft, so it shouldn't feel like a settings menu.
 * The choices are counter tickets from a telegraph office.
 */
export function ChoosePhase({ words, onChoose, onBack }: Props) {
  return (
    <div className="phase phase-choose">
      <p className="choose-count">
        Class of service · {words === 1 ? '1 word' : `${words} words`}
      </p>
      <h1 className="choose-title">How should it go?</h1>

      <div className="choose-options">
        {DESTROYERS.map((destroyer, i) => {
          const { Mark } = destroyer
          return (
            <button
              key={destroyer.id}
              className={`ticket ticket-${destroyer.id}`}
              aria-label={`${destroyer.name}. ${destroyer.tagline}`}
              onClick={() => onChoose(destroyer.id)}
            >
              {/* Lettered in registry order, so a third destroyer is Service C. */}
              <span className="fine-print">Service {String.fromCharCode(65 + i)}</span>
              <span className="ticket-mark" aria-hidden="true">
                <Mark />
              </span>
              <span className="printed ticket-name">{destroyer.short}</span>
              <span className="ticket-perforation" aria-hidden="true" />
              <span className="ticket-tagline">{destroyer.tagline}</span>
            </button>
          )
        })}
      </div>

      <button className="button button-ghost" onClick={onBack}>
        Not yet — keep writing
      </button>
    </div>
  )
}
