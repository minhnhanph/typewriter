import { useCallback, useEffect, useMemo, useState } from 'react'
import { AftermathPhase } from './features/aftermath/AftermathPhase'
import { ChoosePhase, type ExtraTicket } from './features/destruction/ChoosePhase'
import { DestructionPhase } from './features/destruction/DestructionPhase'
import { ReadingPhase } from './features/sending/ReadingPhase'
import { SendPhase } from './features/sending/SendPhase'
import { EnvelopeMark, ReplyMark } from './features/sending/marks'
import { WritingPhase } from './features/writing/WritingPhase'
import type { ReceiptData } from './features/aftermath/Receipt'
import { findDestroyer } from './features/destruction/registry'
import { countWords } from './core/text'
import { draftText } from './core/sheet'
import { forgetLetter, hasLetter, readLetter } from './lib/letterLink'
import { setMuted } from './lib/sound'
import { SoundIcon } from './lib/SoundIcon'
import { useLocalDraft } from './lib/useLocalDraft'

/**
 * The whole app is one short journey, so its state is one short list of stages.
 * Keeping it here means each phase component can stay ignorant of the others.
 *
 * A friend opening a letter link takes a shorter one: open (unpacking the
 * link), read, then choose its fate -- the same destroyers, or write back.
 */
type Stage =
  | { name: 'write'; reply?: boolean }
  | { name: 'choose' }
  | { name: 'destroy'; destroyerId: string; filedAt: Date; received: boolean }
  | { name: 'send'; filedAt: Date }
  | { name: 'aftermath'; receipt: ReceiptData; stamp: string; link?: string }
  | { name: 'open' }
  | { name: 'read' }
  | { name: 'choose-letter' }

/** A docket number for the receipt. Made up; nothing is stored. */
const docketNumber = () => String(Math.floor(Math.random() * 10_000)).padStart(4, '0')

export default function App() {
  const { draft, setDraft, discard } = useLocalDraft()
  const text = useMemo(() => draftText(draft), [draft])
  const [stage, setStage] = useState<Stage>(() =>
    hasLetter() ? { name: 'open' } : { name: 'write' },
  )
  /** A frozen copy of the text being destroyed or sent. The draft itself is already gone. */
  const [condemned, setCondemned] = useState('')
  /** A letter a friend sent, held only in memory. Its one other copy is the link. */
  const [letter, setLetter] = useState('')

  // Unpack a letter from the address, and again if one is pasted into this tab.
  useEffect(() => {
    const open = () => {
      if (!hasLetter()) return
      setStage({ name: 'open' })
      readLetter().then((text) => {
        if (text) {
          setLetter(text)
          setStage({ name: 'read' })
        } else {
          // Damaged or doctored. Nothing to show, so straight to a fresh page.
          forgetLetter()
          setStage({ name: 'write' })
        }
      })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])
  // On from the start; the first keystroke is what lets the browser play it.
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
      setStage({ name: 'destroy', destroyerId, filedAt: new Date(), received: false })
    },
    [text, discard],
  )

  /** Sending is a point of no return too: the link becomes the only copy. */
  const beginSend = useCallback(() => {
    setCondemned(text)
    discard()
    setStage({ name: 'send', filedAt: new Date() })
  }, [text, discard])

  /** The friend's choice. Their own saved draft, if any, is left alone. */
  const destroyLetter = useCallback(
    (destroyerId: string) => {
      setCondemned(letter)
      setLetter('')
      forgetLetter()
      setStage({ name: 'destroy', destroyerId, filedAt: new Date(), received: true })
    },
    [letter],
  )

  const writeBack = useCallback(() => {
    setLetter('')
    forgetLetter()
    setStage({ name: 'write', reply: true })
  }, [])

  const finishDestruction = useCallback(() => {
    setStage((current) =>
      current.name !== 'destroy'
        ? current
        : {
            name: 'aftermath',
            stamp: current.received ? 'Destroyed on receipt' : 'Not delivered',
            receipt: {
              number: docketNumber(),
              words: countWords(condemned),
              characters: condemned.replace(/\s/g, '').length,
              filedAt: current.filedAt,
              destroyedAt: new Date(),
              outcome: 'destroyed',
              method: findDestroyer(current.destroyerId)?.short ?? current.destroyerId,
            },
          },
    )
    setCondemned('')
  }, [condemned])

  const finishSend = useCallback(
    (link: string) => {
      setStage((current) =>
        current.name !== 'send'
          ? current
          : {
              name: 'aftermath',
              stamp: 'Ready for delivery',
              link,
              receipt: {
                number: docketNumber(),
                words: countWords(condemned),
                characters: condemned.replace(/\s/g, '').length,
                filedAt: current.filedAt,
                destroyedAt: new Date(),
                outcome: 'sent',
                method: 'Send',
              },
            },
      )
      setCondemned('')
    },
    [condemned],
  )

  const sendTicket: ExtraTicket = {
    id: 'send',
    name: 'Send it to a friend',
    short: 'Send',
    tagline: 'Some words deserve to arrive.',
    Mark: EnvelopeMark,
    onPick: beginSend,
  }

  const replyTicket: ExtraTicket = {
    id: 'reply',
    name: 'Write back',
    short: 'Reply',
    tagline: 'Put a fresh sheet in the machine.',
    Mark: ReplyMark,
    onPick: writeBack,
  }

  return (
    <main className="app">
      <button
        className="sound-toggle"
        // Don't take keyboard focus on click, or the writing phase stops
        // receiving keystrokes. Tab still reaches it.
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleSound}
        aria-label={sound ? 'Turn sound off' : 'Turn sound on'}
        aria-pressed={sound}
        title={sound ? 'Sound off' : 'Sound on'}
      >
        <SoundIcon on={sound} />
      </button>

      {stage.name === 'write' && (
        <WritingPhase
          draft={draft}
          onChange={setDraft}
          onDone={() => setStage({ name: 'choose' })}
          title={stage.reply ? 'Reply' : undefined}
        />
      )}

      {stage.name === 'choose' && (
        <ChoosePhase
          words={countWords(text)}
          onChoose={beginDestruction}
          extras={[sendTicket]}
          back={{ label: 'Not yet — keep writing', onClick: () => setStage({ name: 'write' }) }}
        />
      )}

      {stage.name === 'read' && (
        <ReadingPhase text={letter} onRead={() => setStage({ name: 'choose-letter' })} />
      )}

      {stage.name === 'choose-letter' && (
        <ChoosePhase
          words={countWords(letter)}
          onChoose={destroyLetter}
          extras={[replyTicket]}
          back={{ label: 'Read it again', onClick: () => setStage({ name: 'read' }) }}
        />
      )}

      {stage.name === 'destroy' && (
        <DestructionPhase
          text={condemned}
          destroyerId={stage.destroyerId}
          onComplete={finishDestruction}
        />
      )}

      {stage.name === 'send' && <SendPhase text={condemned} onComplete={finishSend} />}

      {stage.name === 'aftermath' && (
        <AftermathPhase
          receipt={stage.receipt}
          stamp={stage.stamp}
          link={stage.link}
          onWriteAgain={() => setStage({ name: 'write' })}
        />
      )}
    </main>
  )
}
