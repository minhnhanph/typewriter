import { useEffect, useState } from 'react'

/**
 * The current time, updated on the minute -- for the FILED box. Timed to the
 * minute boundary rather than polled, so it flips when the real clock does.
 */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number
    const schedule = () => {
      const untilNextMinute = 60_000 - (Date.now() % 60_000)
      timer = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, untilNextMinute)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  return now
}
