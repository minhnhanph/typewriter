import { useCallback, useEffect, useRef, useState } from 'react'
import { draftFromText, emptyDraft, isDraft, type Draft } from '../core/sheet'

const KEY = 'typewriter:sheet'
/** Where drafts lived when they were plain text. Read once, then removed. */
const OLD_KEY = 'typewriter:draft'

function load(): Draft {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (isDraft(parsed)) return parsed
    }
    const old = localStorage.getItem(OLD_KEY)
    if (old) return draftFromText(old)
  } catch {
    // Private browsing, storage disabled, a damaged save. Not worth crashing over.
  }
  return emptyDraft()
}

const isBlank = (draft: Draft) => draft.rows.every((row) => row.every((cell) => !cell))

/**
 * Keeps the draft in the browser's own storage so an accidental refresh
 * doesn't lose a long entry. It never leaves the user's device -- there is no
 * server. `discard` is called the moment they commit to destroying the text,
 * so the words don't come back to haunt them on the next visit.
 */
export function useLocalDraft() {
  const [draft, setDraft] = useState(load)

  const timer = useRef<number | undefined>(undefined)

  // Debounced so we're not hitting storage on every single keystroke.
  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        if (isBlank(draft)) localStorage.removeItem(KEY)
        else localStorage.setItem(KEY, JSON.stringify(draft))
        localStorage.removeItem(OLD_KEY)
      } catch {
        /* ignore */
      }
    }, 400)
    return () => window.clearTimeout(timer.current)
  }, [draft])

  const discard = useCallback(() => {
    window.clearTimeout(timer.current)
    try {
      localStorage.removeItem(KEY)
      localStorage.removeItem(OLD_KEY)
    } catch {
      /* ignore */
    }
    setDraft(emptyDraft())
  }, [])

  return { draft, setDraft, discard }
}
