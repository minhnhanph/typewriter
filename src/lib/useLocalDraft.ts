import { useCallback, useEffect, useRef, useState } from 'react'

const KEY = 'typewriter:draft'

/**
 * Keeps the draft in the browser's own storage so an accidental refresh
 * doesn't lose a long entry. It never leaves the user's device -- there is no
 * server. `discard` is called the moment they commit to destroying the text,
 * so the words don't come back to haunt them on the next visit.
 */
export function useLocalDraft() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(KEY) ?? ''
    } catch {
      return '' // private browsing, storage disabled, etc. Not worth crashing over.
    }
  })

  const timer = useRef<number | undefined>(undefined)

  // Debounced so we're not hitting storage on every single keystroke.
  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        if (text) localStorage.setItem(KEY, text)
        else localStorage.removeItem(KEY)
      } catch {
        /* ignore */
      }
    }, 400)
    return () => window.clearTimeout(timer.current)
  }, [text])

  const discard = useCallback(() => {
    window.clearTimeout(timer.current)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setText('')
  }, [])

  return { text, setText, discard }
}
