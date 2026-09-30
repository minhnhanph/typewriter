import { useCallback, useState } from 'react'
import { AftermathPhase } from './features/aftermath/AftermathPhase'
import { ChoosePhase } from './features/destruction/ChoosePhase'
import { DestructionPhase } from './features/destruction/DestructionPhase'
import { WritingPhase } from './features/writing/WritingPhase'
import type { ReceiptData } from './features/aftermath/Receipt'
import { findDestroyer } from './features/destruction/registry'
import { countWords } from './core/text'
import { setMuted } from './lib/sound'
import { useLocalDraft } from './lib/useLocalDraft'

/**
 * The whole app is one short journey, so its state is one short list of stages.
 * Keeping it here means each phase component can stay ignorant of the others.
 */
type Stage =
  | { name: 'write' }
  | { name: 'choose' }
  | { name: 'destroy'; destroyerId: string; filedAt: Date }
  | { name: 'aftermath'; receipt: ReceiptData }

/** A docket number for the receipt. Made up; nothing is stored. */
const docketNumber = () => String(Math.floor(Math.random() * 10_000)).padStart(4, '0')

export default function App() {
  const { text, setText, discard } = useLocalDraft()
  const [stage, setStage] = useState<Stage>({ name: 'write' })
  /** A frozen copy of the text being destroyed. The draft itself is already gone. */
  const [condemned, setCondemned] = useState('')
  const [sound, setSound] = useState(true)

  const toggleSound = () => {
    setSound((on) => {
      setMuted(on)
      return !on
    })
  }

  const beginDestruction = useCallback(
    (destroyerId: string) => {
      setCondemned(text)
      // The point of no return: the saved draft dies the moment they commit,
      // so the words can't come back on the next visit.
      discard()
      setStage({ name: 'destroy', destroyerId, filedAt: new Date() })
    },
    [text, discard],
  )

  const finishDestruction = useCallback(() => {
    setStage((current) =>
      current.name !== 'destroy'
        ? current
        : {
            name: 'aftermath',
            receipt: {
              number: docketNumber(),
              words: countWords(condemned),
              characters: condemned.replace(/\s/g, '').length,
              filedAt: current.filedAt,
              destroyedAt: new Date(),
              method: findDestroyer(current.destroyerId)?.short ?? current.destroyerId,
            },
          },
    )
    setCondemned('')
  }, [condemned])

  return (
    <main className="app">
      <button
        className="sound-toggle"
        // Don't take keyboard focus on click, or the writing phase stops
        // receiving keystrokes. Tab still reaches it.
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleSound}
        aria-label={sound ? 'Mute sound' : 'Unmute sound'}
        title={sound ? 'Mute' : 'Unmute'}
      >
        {sound ? '♪' : '✕'}
      </button>

      {stage.name === 'write' && (
        <WritingPhase text={text} onChange={setText} onDone={() => setStage({ name: 'choose' })} />
      )}

      {stage.name === 'choose' && (
        <ChoosePhase
          words={countWords(text)}
          onChoose={beginDestruction}
          onBack={() => setStage({ name: 'write' })}
        />
      )}

      {stage.name === 'destroy' && (
        <DestructionPhase
          text={condemned}
          destroyerId={stage.destroyerId}
          onComplete={finishDestruction}
        />
      )}

      {stage.name === 'aftermath' && (
        <AftermathPhase receipt={stage.receipt} onWriteAgain={() => setStage({ name: 'write' })} />
      )}
    </main>
  )
}
