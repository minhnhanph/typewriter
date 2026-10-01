/**
 * Line drawings for the two tickets that aren't destroyers. Drawn like the
 * destroyers' marks: an 80×40 box, `currentColor`, a ground line in ink.
 */

export function EnvelopeMark() {
  return (
    <svg
      viewBox="0 0 80 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="24" y="8" width="32" height="22" rx="1.5" />
      <path d="M24 9 L40 21 L56 9" />
      <path d="M24 37 H56" strokeWidth="1.4" style={{ stroke: 'var(--ink)' }} />
    </svg>
  )
}

export function ReplyMark() {
  return (
    <svg
      viewBox="0 0 80 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* A fresh sheet, and the carriage-return arrow sending it back. */}
      <path d="M30 6 H50 V32 H30 Z" strokeWidth="1.8" style={{ stroke: 'var(--ink)' }} />
      <path d="M35 13 H45 M35 18 H45" strokeWidth="1.4" style={{ stroke: 'var(--ink)' }} />
      <path d="M45 25 H24" />
      <path d="M29 20 L24 25 L29 30" />
      <path d="M24 37 H56" strokeWidth="1.4" style={{ stroke: 'var(--ink)' }} />
    </svg>
  )
}
