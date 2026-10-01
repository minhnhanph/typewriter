import { useEffect, useMemo, useRef } from 'react'
import { letterLink } from '../../lib/letterLink'

type Props = {
  text: string
  /** Called with the link once the letter is sealed and the link is ready. */
  onComplete: (link: string) => void
}

/**
 * How long the whole envelope takes: the sheet slides in, the flap closes, the
 * seal presses, the envelope turns over and the postmark lands. Matches the
 * delays in sending.css.
 */
const SEAL_MS = 4600

/**
 * The third ending, in place of the destruction stage. The draft is already
 * gone from this browser; the sheet goes into an envelope while its link is
 * packed, and the link becomes the only copy.
 */
export function SendPhase({ text, onComplete }: Props) {
  const done = useRef(onComplete)
  done.current = onComplete

  useEffect(() => {
    let cancelled = false
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sealed = new Promise((resolve) => window.setTimeout(resolve, quiet ? 300 : SEAL_MS))
    Promise.all([letterLink(text), sealed]).then(([link]) => {
      if (!cancelled) done.current(link)
    })
    return () => {
      cancelled = true
    }
  }, [text])

  return (
    <div className="phase phase-send">
      <p className="ticker">
        <span>Transmission accepted</span>
        <span>
          <em>{text.replace(/\s/g, '').length}</em> characters
        </span>
        <span>Sealing</span>
      </p>

      <div className="send-stage" aria-hidden="true">
        <div className="envelope">
          <EnvelopeBack text={text} />
          <EnvelopeFace />
        </div>
      </div>
    </div>
  )
}

/** The flap side, where the letter goes in. */
function EnvelopeBack({ text }: { text: string }) {
  return (
    <div className="envelope-side envelope-back">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="envelope-flap">
        <path d="M0 0 L50 34 L100 0" />
      </svg>
      <pre className="letter-sheet">{text}</pre>
      <div className="envelope-pocket">
        {/* The folds where the side flaps and the bottom flap overlap. */}
        <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="envelope-fold">
          <path d="M0 60 L50 26 L100 60 M0 0 L36 35.5 M100 0 L64 35.5" />
        </svg>
      </div>
      <span className="envelope-seal">
        <span className="printed">T</span>
      </span>
    </div>
  )
}

/** The address side: an airmail envelope, stamped and postmarked. */
function EnvelopeFace() {
  const today = useMemo(() => new Date(), [])
  const day = today.toLocaleDateString([], { day: 'numeric', month: 'short' }).toUpperCase()

  return (
    <div className="envelope-side envelope-face">
      <div className="envelope-face-paper">
        <span className="airmail-label printed">By air mail</span>

        <span className="postage">
          <span className="postage-art">
            <PostageTypewriter />
            <span className="postage-value printed">Letter post</span>
          </span>
        </span>

        <svg className="postmark" viewBox="0 0 200 90">
          {/* Wavy cancel lines running out from the postmark. */}
          <path d="M0 30 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0" />
          <path d="M0 45 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0" />
          <path d="M0 60 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0" />
          <circle cx="155" cy="45" r="40" />
          <circle cx="155" cy="45" r="27" />
          {/* Words around the ring, as real postmarks have them: one arc over
              the top, one along the bottom, both reading upright. */}
          <defs>
            <path id="postmark-top" d="M124 45 A31 31 0 0 1 186 45" />
            <path id="postmark-bottom" d="M118 45 A37 37 0 0 0 192 45" />
          </defs>
          <text className="postmark-ring-text">
            <textPath href="#postmark-top" startOffset="50%">
              SENT BY HAND
            </textPath>
          </text>
          <text className="postmark-ring-text">
            <textPath href="#postmark-bottom" startOffset="50%">
              TYPEWRITER
            </textPath>
          </text>
          <text className="postmark-date" x="155" y="44">
            {day}
          </text>
          <text className="postmark-year" x="155" y="58">
            {today.getFullYear()}
          </text>
        </svg>

        <div className="envelope-address">
          <span className="printed">To</span>
          <span className="envelope-address-line">a friend</span>
          <span className="envelope-address-line" />
          <span className="envelope-address-line" />
        </div>
      </div>
    </div>
  )
}

/** The machine in miniature, engraved on the postage stamp. */
function PostageTypewriter() {
  return (
    <svg viewBox="0 0 40 30" className="postage-drawing">
      <path d="M12 9 V3 H28 V9" />
      <path d="M5 10 H35" />
      <path d="M7 12 H33 L36 27 H4 Z" />
      <circle cx="11" cy="17" r="1.2" />
      <circle cx="16" cy="17" r="1.2" />
      <circle cx="21" cy="17" r="1.2" />
      <circle cx="26" cy="17" r="1.2" />
      <circle cx="13.5" cy="21.5" r="1.2" />
      <circle cx="18.5" cy="21.5" r="1.2" />
      <circle cx="23.5" cy="21.5" r="1.2" />
      <circle cx="28.5" cy="21.5" r="1.2" />
    </svg>
  )
}
