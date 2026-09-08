import { useEffect, useState } from 'react'

/**
 * Touch devices have no arrow keys, so they get the watch-only version of the
 * snake instead of the playable one. Same ending either way.
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(hover: none) and (pointer: coarse)')
    const update = () => setIsTouch(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isTouch
}
