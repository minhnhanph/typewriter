import { useRef, useState } from 'react'
import { useIsTouch } from '../../lib/useIsTouch'

/**
 * The link to hand over, on a slip under the receipt. On a phone the button
 * opens the share menu; on a computer it copies. If neither works, the link is
 * selected so it can be copied by hand.
 */
export function LinkSlip({ link }: { link: string }) {
  const isTouch = useIsTouch()
  const field = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const canShare = isTouch && typeof navigator.share === 'function'

  const hand = async () => {
    if (canShare) {
      try {
        await navigator.share({ text: 'Someone typed you a letter.', url: link })
        return
      } catch (error) {
        // They closed the share menu themselves; nothing to fall back to.
        if ((error as Error).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      field.current?.select()
    }
  }

  return (
    <section className="link-slip" aria-label="The letter's link">
      <p className="fine-print">Hand this to your friend</p>
      <input
        ref={field}
        className="link-slip-field"
        readOnly
        value={link}
        aria-label="Link to the letter"
        onFocus={(event) => event.currentTarget.select()}
      />
      <button className="button button-primary" onClick={hand}>
        {canShare ? 'Share link' : copied ? 'Copied' : 'Copy link'}
      </button>
      <p className="link-slip-note">
        This link is the only copy. Close the page without sending it and the letter is gone.
      </p>
    </section>
  )
}
