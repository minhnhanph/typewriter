import { useMemo } from 'react'
import { LinkSlip } from '../sending/LinkSlip'
import { Receipt, type ReceiptData } from './Receipt'

type Props = {
  receipt: ReceiptData
  /** The rubber stamp's words: NOT DELIVERED, READY FOR DELIVERY, ... */
  stamp: string
  /** A sent letter's link. Its presence means nothing burned, so no ash. */
  link?: string
  onWriteAgain: () => void
}

const ASH_COUNT = 34

/**
 * Phase 3. The words are already gone by the time we get here -- this screen
 * exists so the destruction has somewhere to settle instead of snapping back
 * to a blank page.
 */
export function AftermathPhase({ receipt, stamp, link, onWriteAgain }: Props) {
  // Generated once so the ash doesn't reshuffle on every render.
  const ashes = useMemo(
    () =>
      Array.from({ length: ASH_COUNT }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 7 + Math.random() * 7,
        drift: (Math.random() - 0.5) * 120,
        size: 2 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.4,
      })),
    [],
  )

  return (
    <div className="phase phase-aftermath">
      {!link && (
        <div className="ashfall" aria-hidden="true">
          {ashes.map((ash, i) => (
            <span
              key={i}
              className="ash"
              style={
                {
                  '--left': `${ash.left}%`,
                  '--delay': `${ash.delay}s`,
                  '--duration': `${ash.duration}s`,
                  '--drift': `${ash.drift}px`,
                  '--size': `${ash.size}px`,
                  '--opacity': ash.opacity,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className="aftermath-content">
        <p className="printed stamp">{stamp}</p>
        <Receipt receipt={receipt} />
        {link && <LinkSlip link={link} />}
        <button
          className={`button ${link ? 'button-ghost' : 'button-primary'}`}
          onClick={onWriteAgain}
        >
          Write something else
        </button>
      </div>
    </div>
  )
}
