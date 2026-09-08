import { DESTROYERS } from './registry'

type Props = {
  words: number
  onChoose: (id: string) => void
  onBack: () => void
}

/**
 * The commitment screen. Deliberately quiet -- this is the moment the words
 * stop being a draft, so it shouldn't feel like a settings menu.
 */
export function ChoosePhase({ words, onChoose, onBack }: Props) {
  return (
    <div className="phase phase-choose">
      <p className="choose-count">{words === 1 ? '1 word' : `${words} words`}</p>
      <h1 className="choose-title">How should it go?</h1>

      <div className="choose-options">
        {DESTROYERS.map((destroyer) => (
          <button key={destroyer.id} className="choice" onClick={() => onChoose(destroyer.id)}>
            <span className={`choice-mark choice-mark-${destroyer.id}`} aria-hidden="true" />
            <span className="choice-name">{destroyer.name}</span>
            <span className="choice-tagline">{destroyer.tagline}</span>
          </button>
        ))}
      </div>

      <button className="button button-ghost" onClick={onBack}>
        Not yet — keep writing
      </button>
    </div>
  )
}
