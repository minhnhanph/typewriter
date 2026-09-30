import { useEffect, useState } from 'react'

/**
 * Touch devices have no arrow keys, so they get the watch-only version of the
 * snake instead of the playable one. Same ending either way.
 */
const TOUCH_QUERY = '(hover: none) and (pointer: coarse)'

export function useIsTouch(): boolean {
  // Read on the first render, not after it. The snake decides whether to steer
  // itself from its first render, so a late answer left phones stuck with a
  // manual snake and no keyboard to steer it.
  const [isTouch, setIsTouch] = useState(() => window.matchMedia(TOUCH_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(TOUCH_QUERY)
    const update = () => setIsTouch(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isTouch
}
