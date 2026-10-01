/**
 * The way into the anatomy: a tiny drawing of the machine with one patent
 * callout. Like every control on the writing screen it refuses focus on click,
 * or typing would silently stop.
 */
export function AnatomyButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      className="anatomy-button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onOpen}
      aria-label="Typewriter anatomy"
      title="Anatomy"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {/* platen, body, keys */}
        <rect x="5" y="5" width="12" height="2.6" rx="1.3" />
        <path d="M3.5 18.5 L5.5 9.5 H16.5 L18.5 18.5 Z" />
        <path d="M7.2 13.2 h7.6 M6.6 16 h8.8" />
        {/* the callout */}
        <path d="M14 11.3 L20.5 4.5" />
        <circle cx="14" cy="11.3" r="0.9" className="anatomy-button-dot" />
      </svg>
    </button>
  )
}
