import { formatTime } from '../../lib/time'

export type ReceiptData = {
  /** Four digits, made up per message, like a clerk's docket number. */
  number: string
  words: number
  characters: number
  /** When they chose a destroyer -- the moment the draft was deleted. */
  filedAt: Date
  /** When the last character went, or the letter was sealed. */
  destroyedAt: Date
  /** What happened to it, which also labels that time. */
  outcome: 'destroyed' | 'sent'
  /** The destroyer's one-word name. */
  method: string
}

/**
 * The only record left of words that no longer exist: counts and times, never
 * the text. Torn off the pad, so it has a zig-zag bottom edge.
 */
export function Receipt({ receipt }: { receipt: ReceiptData }) {
  const rows: [string, string][] = [
    ['words', String(receipt.words)],
    ['characters', String(receipt.characters)],
    ['filed', formatTime(receipt.filedAt)],
    [receipt.outcome, formatTime(receipt.destroyedAt)],
    ['method', receipt.method.toLowerCase()],
  ]

  return (
    <section className="receipt" aria-label="Receipt">
      <p className="fine-print receipt-title">Receipt · No. {receipt.number}</p>
      <dl>
        {rows.map(([label, value]) => (
          <div className="receipt-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
