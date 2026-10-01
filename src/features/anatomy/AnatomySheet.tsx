import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { FigureControls } from './Figure'
import { NUMBERED } from './parts'

/** The drawing, and three.js with it, download the first time the sheet opens. */
const Figure = lazy(() => import('./Figure'))

/**
 * The machine laid out as a patent sheet: a ruled border, a printed header, the
 * figure in the middle, a numbered parts list in the corner, and a note for
 * whichever part is selected.
 *
 * A modal <dialog>, so while it's open the writing page underneath can't take
 * a single keystroke. It only draws; it never touches the draft.
 */
export function AnatomySheet({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const figure = useRef<FigureControls>(null)
  const [selected, setSelected] = useState<string | null>(null)
  /** Phones only: the parts list folds away behind a toggle. */
  const [listOpen, setListOpen] = useState(false)
  const part = NUMBERED.find((p) => p.id === selected)

  useEffect(() => {
    const el = dialog.current!
    el.showModal()
    // Start on the sheet itself, not on its first button.
    el.focus()
    return () => el.close()
  }, [])

  const choose = (id: string | null) => {
    setSelected((current) => (current === id ? null : id))
    setListOpen(false)
  }

  return (
    <dialog
      ref={dialog}
      className="anatomy"
      tabIndex={-1}
      aria-labelledby="anatomy-title"
      onCancel={(event) => {
        // Esc. Let React unmount it rather than the browser closing it under us.
        event.preventDefault()
        onClose()
      }}
    >
      <div className="anatomy-sheet">
        <header className="anatomy-head">
          <h2 id="anatomy-title" className="anatomy-title">
            Typewriter <span aria-hidden="true">·</span> Anatomy
          </h2>
          <div className="anatomy-meta">
            <button className="anatomy-tool" onClick={() => figure.current?.reset()}>
              Reset
            </button>
            <span className="anatomy-sheetno">Sheet 1 of 1</span>
            <span className="anatomy-sheetno">Fig. 1</span>
            <button className="anatomy-close" aria-label="Close the anatomy" onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <div className="anatomy-body">
          <Suspense fallback={<p className="anatomy-loading">Drawing…</p>}>
            <Figure ref={figure} selected={selected} onSelect={choose} />
          </Suspense>

          <nav className={`anatomy-legend${listOpen ? ' is-open' : ''}`} aria-label="Parts">
            <button
              className="anatomy-tool anatomy-legend-toggle"
              aria-expanded={listOpen}
              onClick={() => setListOpen((open) => !open)}
            >
              Parts
            </button>
            <ol className="anatomy-parts">
              {NUMBERED.map((p) => (
                <li key={p.id}>
                  <button
                    className={`anatomy-part${p.id === selected ? ' is-selected' : ''}`}
                    aria-pressed={p.id === selected}
                    onClick={() => choose(p.id)}
                  >
                    <span className="anatomy-part-no">{p.no}</span>
                    {p.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <aside className={`anatomy-note${part ? ' is-open' : ''}`} aria-live="polite">
            {part ? (
              <>
                <h3 className="anatomy-note-title">
                  <span className="anatomy-part-no">{part.no}</span>
                  {part.name}
                </h3>
                <p>{part.real}</p>
                <p className="anatomy-note-site">{part.site}</p>
              </>
            ) : (
              <p className="anatomy-hint fine-print">Drag to turn it · click a part</p>
            )}
          </aside>
        </div>
      </div>
    </dialog>
  )
}
