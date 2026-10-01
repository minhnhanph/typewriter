import { formatTime } from '../../lib/time'
import { useClock } from '../../lib/useClock'

type Props = {
  words: number
  /** The printed heading: TELEGRAM, or REPLY / INCOMING for a sent letter. */
  title?: string
  /** What the clock box is labelled. */
  timeLabel?: string
}

/**
 * The top of a telegram blank, and nothing else from it. The word count and
 * the time live here, the way a clerk would fill them in. Tucked into the
 * top-left corner, so the paper has the middle of the screen to rise into.
 */
export function TelegramStrip({ words, title = 'Telegram', timeLabel = 'Filed' }: Props) {
  const now = useClock()

  return (
    <header className="telegram-strip">
      <span className="telegram-part printed telegram-title">{title}</span>
      <span className="telegram-part">
        <span className="telegram-box">
          <span className="fine-print">Words</span>
          <b>{words}</b>
        </span>
        <span className="telegram-box">
          <span className="fine-print">{timeLabel}</span>
          <b>{formatTime(now)}</b>
        </span>
      </span>
    </header>
  )
}
