import { useMemo } from 'react'

type Props = {
  words: number
  characters: number
  onWriteAgain: () => void
}

const ASH_COUNT = 34

/**
 * Phase 3. The words are already gone by the time we get here -- this screen
 * exists so the destruction has somewhere to settle instead of snapping back
 * to a blank page.
 */
export function AftermathPhase({ words, characters, onWriteAgain }: Props) {
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

      <div className="aftermath-content">
        <p className="aftermath-stat">
          {words === 1 ? '1 word' : `${words} words`}
          <span className="aftermath-stat-sub">{characters} characters, gone</span>
        </p>
        <button className="button button-primary" onClick={onWriteAgain}>
          Write something else
        </button>
      </div>
    </div>
  )
}
