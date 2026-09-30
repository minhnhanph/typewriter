import { COLS } from '../../core/text'
import { formatTime } from '../../lib/time'
import { useClock } from '../../lib/useClock'

type Props = {
  words: number
}

/**
 * The top of a telegram blank, and nothing else from it. The word count and
 * the time live here, the way a clerk would fill them in; the rest of the page
 * stays blank paper.
 */
export function TelegramStrip({ words }: Props) {
  const now = useClock()

  return (
    <header className="telegram-strip" style={{ '--cols': COLS } as React.CSSProperties}>
      <span className="printed telegram-title">Telegram</span>
      <span className="telegram-box">
        <span className="fine-print">Words</span>
        <b>{words}</b>
      </span>
      <span className="telegram-box">
        <span className="fine-print">Filed</span>
        <b>{formatTime(now)}</b>
      </span>
    </header>
  )
}
