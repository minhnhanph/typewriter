/**
 * The sound toggle's mark: a music note, with a small cross on it when sound
 * is off. Drawn in the current text colour, so the toggle's hover still works.
 */
export function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="sound-icon">
      <ellipse cx="5.6" cy="12" rx="2.3" ry="1.7" transform="rotate(-20 5.6 12)" className="sound-icon-fill" />
      <path d="M7.7 11.4 V2.6 C8.6 4.2 11.2 4.6 11.4 7.2" />
      {!on && <path d="M10.2 9.6 L14.2 13.6 M14.2 9.6 L10.2 13.6" />}
    </svg>
  )
}
