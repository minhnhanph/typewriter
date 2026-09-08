import { useEffect, useRef } from 'react'
import { COLS, type Pos } from '../../core/text'

type Props = {
  lines: string[]
  caret: Pos
  placeholder?: string
}

/**
 * The page itself. It only draws -- it owns no text state. That separation is
 * what lets the destruction phase reuse the exact same coordinate system.
 */
export function Paper({ lines, caret, placeholder }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const caretRef = useRef<HTMLSpanElement>(null)
  const isEmpty = lines.length === 1 && lines[0] === ''

  // Keep the line being typed on visible as the page fills up.
  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: 'nearest' })
  }, [caret.row, caret.col])

  return (
    <div className="paper" ref={scroller}>
      <div className="paper-sheet" style={{ '--cols': COLS } as React.CSSProperties}>
        {isEmpty && placeholder && <p className="paper-placeholder">{placeholder}</p>}

        {lines.map((line, row) => (
          <div className="paper-line" key={row}>
            {line || ' '}
          </div>
        ))}

        <span
          ref={caretRef}
          className="paper-caret"
          style={{ '--row': caret.row, '--col': caret.col } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
