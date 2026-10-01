import { useEffect, useRef } from 'react'
import type { Scene } from './scene'

/** Degrees of turn per pixel dragged. */
const DRAG_SPEED = 0.4
/** Further than this and a press is a drag, not a click. */
const DRAG_THRESHOLD = 4
/** One arrow-key press. */
const KEY_STEP = 15

/**
 * Turning the machine: drag with a mouse or a finger, or the arrow keys.
 * The first touch of anything during the opening skips straight to the end.
 * A press that barely moves is a click, and goes to `onTap`.
 */
export function useOrbit(scene: React.RefObject<Scene | null>, onTap: (x: number, y: number) => void) {
  const press = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)
  const tap = useRef(onTap)
  tap.current = onTap

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const step = {
        ArrowLeft: [KEY_STEP, 0],
        ArrowRight: [-KEY_STEP, 0],
        ArrowUp: [0, KEY_STEP],
        ArrowDown: [0, -KEY_STEP],
      }[event.key]
      const s = scene.current
      if (!s) return
      s.skipAssembly()
      if (!step) return
      event.preventDefault()
      s.rotateBy(step[0], step[1], true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [scene])

  return {
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      if (!event.isPrimary || event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
      scene.current?.skipAssembly()
    },
    onPointerMove(event: React.PointerEvent<HTMLElement>) {
      const p = press.current
      if (!p || p.id !== event.pointerId) return
      const dx = event.clientX - p.x
      const dy = event.clientY - p.y
      if (!p.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      p.moved = true
      scene.current?.rotateBy(-dx * DRAG_SPEED, dy * DRAG_SPEED)
      p.x = event.clientX
      p.y = event.clientY
    },
    onPointerUp(event: React.PointerEvent<HTMLElement>) {
      const p = press.current
      if (!p || p.id !== event.pointerId) return
      press.current = null
      if (!p.moved) {
        const box = event.currentTarget.getBoundingClientRect()
        tap.current(event.clientX - box.left, event.clientY - box.top)
      }
    },
    onPointerCancel() {
      press.current = null
    },
  }
}
