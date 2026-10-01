import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { playBell } from '../../lib/sound'
import { createScene, type Label, type Scene } from './scene'
import { useOrbit } from './useOrbit'

export type FigureControls = { reset: () => void }

type Props = {
  selected: string | null
  onSelect: (id: string | null) => void
  /** The part under the pointer here, or under it in the parts list. */
  hovered: string | null
  onHover: (id: string | null) => void
  ref?: React.Ref<FigureControls>
}

/** The radius of a number's circle, where its leader line starts. */
const BADGE = 11

/**
 * The drawing and its numbers. The machine is a three.js canvas; the numbers
 * and leader lines are ordinary page elements laid over it, so they stay
 * crisp and use the site's fonts.
 *
 * This file (and three.js with it) is only downloaded when the sheet opens.
 */
export default function Figure({ selected, onSelect, hovered, onHover, ref }: Props) {
  const stage = useRef<HTMLDivElement>(null)
  const scene = useRef<Scene | null>(null)
  const [labels, setLabels] = useState<Label[]>([])

  useImperativeHandle(ref, () => ({ reset: () => scene.current?.reset() }), [])

  useEffect(() => {
    // A fresh canvas each mount: a WebGL context, once given back, can't be reused.
    const canvas = document.createElement('canvas')
    canvas.className = 'anatomy-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    stage.current!.prepend(canvas)
    const s = createScene(canvas, {
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      onFrame: setLabels,
      onLanded: playBell,
    })
    scene.current = s
    const observer = new ResizeObserver(([entry]) =>
      s.resize(entry.contentRect.width, entry.contentRect.height),
    )
    observer.observe(stage.current!)
    return () => {
      observer.disconnect()
      s.dispose()
      canvas.remove()
      scene.current = null
    }
  }, [])

  useEffect(() => scene.current?.select(selected), [selected])
  useEffect(() => scene.current?.hover(hovered), [hovered])

  const orbit = useOrbit(scene, (x, y) => {
    const id = scene.current?.pick(x, y) ?? null
    // Clicking the selected part again, or empty paper, puts the note away.
    onSelect(id === selected ? null : id)
  })

  return (
    <div
      ref={stage}
      className="anatomy-stage"
      style={{ cursor: hovered ? 'pointer' : undefined }}
      {...orbit}
      onPointerMove={(event) => {
        orbit.onPointerMove(event)
        if (event.buttons) return
        const box = event.currentTarget.getBoundingClientRect()
        onHover(scene.current?.pick(event.clientX - box.left, event.clientY - box.top) ?? null)
      }}
      onPointerLeave={() => onHover(null)}
    >
      <svg className="anatomy-leaders" aria-hidden="true">
        {labels.map((l) => {
          const dx = l.ax - l.x
          const dy = l.ay - l.y
          const len = Math.hypot(dx, dy) || 1
          const on = l.id === selected
          return (
            <g key={l.id} className={on ? 'is-selected' : l.id === hovered ? 'is-hover' : undefined}>
              <line
                x1={l.x + (dx / len) * BADGE}
                y1={l.y + (dy / len) * BADGE}
                x2={l.ax}
                y2={l.ay}
                strokeDasharray={l.hidden ? '3 3' : undefined}
              />
              <circle cx={l.ax} cy={l.ay} r={1.8} />
            </g>
          )
        })}
      </svg>

      {labels.map((l) => (
        <span
          key={l.id}
          aria-hidden="true"
          className={['anatomy-number', l.id === selected && 'is-selected', l.id === hovered && 'is-hover']
            .filter(Boolean)
            .join(' ')}
          style={{ left: l.x, top: l.y }}
          // The legend is the keyboard route; these are for the pointer.
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onPointerEnter={() => onHover(l.id)}
          onPointerLeave={() => onHover(null)}
          onClick={() => onSelect(l.id === selected ? null : l.id)}
        >
          {l.no}
        </span>
      ))}
    </div>
  )
}
