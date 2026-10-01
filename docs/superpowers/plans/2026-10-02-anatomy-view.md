# Anatomy view Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A patent-drawing sheet, opened from the writing screen, showing a 3D
typewriter the user can rotate and whose numbered parts explain themselves.

**Architecture:** The machine is data (`parts.ts`: primitives, numbers, notes,
exploded offsets). `scene.ts` turns that data into a three.js scene drawn as
paper-filled solids with ink outlines, and owns the camera, assembly animation,
picking and label projection. React (`Figure.tsx`, `AnatomySheet.tsx`) draws
the sheet, legend, notes and number labels over the canvas. three.js loads
only when the sheet opens.

**Tech Stack:** React 19, TypeScript, three.js (`three`, plus
`three/examples/jsm` fat lines and `mergeVertices`), plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-02-anatomy-view-design.md`

## Global Constraints

- No colour hex outside `src/styles/base.css`; the scene reads tokens with `getComputedStyle`.
- three.js must not be in the writing screen's initial download (dynamic `import()`).
- No lights, no shading, no shadows; orthographic camera.
- Clickable things on the writing screen cancel default mousedown (focus gotcha).
- Respect `prefers-reduced-motion`: no assembly, no bell.
- The sheet never reads or writes `useLocalDraft`.
- Tilt clamped to −10°…+80°; arrow keys step 15°; drag threshold 4px.
- Opening rest view: yaw 30°, pitch 20°; assembly ≈ 2s, bell lands last.

## Review Focus

1. Keystrokes while the sheet is open must not reach the hidden textarea (arrow keys would roll the paper, letters would type). → Task 4 check: type "abc" + arrows with sheet open, draft unchanged.
2. Closing must hand typing back without a click. → Task 4 check: Esc, then type, text appears.
3. Repeated open/close must not leak WebGL contexts (Chrome caps them at ~16). → Task 5 check: 20 cycles, no console errors.
4. A drag that ends over a part must not select it. → Task 5 check.
5. Phone width: legend and note must not cover the machine entirely; tapping works with touch. → Task 5 screenshot at 390×844 with touch emulation.

Note: the project has no unit-test runner; every check is a `puppeteer-core`
script driving real Chrome against `npm run dev`, as CLAUDE.md prescribes.

---

### Task 1: The machine as data

**Files:** Create `src/features/anatomy/parts.ts`; Modify `src/features/writing/Keyboard.tsx` (export `ROWS`).

**Interfaces — Produces:**
```ts
export type Vec3 = [number, number, number]
export type Shape =
  | { kind: 'box'; size: Vec3; at?: Vec3; rot?: Vec3 }            // rot in degrees
  | { kind: 'cylinder'; radius: number; length: number; axis?: 'x' | 'y' | 'z'; at?: Vec3 }
  | { kind: 'torus'; radius: number; tube: number; arc?: number; at?: Vec3; rot?: Vec3 }
  | { kind: 'sphere'; radius: number; scale?: Vec3; at?: Vec3 }
  | { kind: 'rod'; from: Vec3; to: Vec3; radius: number }
  | { kind: 'bar'; from: Vec3; to: Vec3; width: number; height: number }
export type Part = { id: string; no?: number; name: string; real?: string; site?: string;
  shapes: Shape[]; exploded: Vec3; order: number; anchor?: Vec3 }
export const PARTS: Part[]
export const NUMBERED: Part[]          // PARTS with a number, sorted by number
export const CENTRE: Vec3; export const RADIUS: number
```
- [ ] Write the 12 numbered parts with the spec's note text, plus unnumbered frame and paper.
- [ ] Keys generated from `ROWS` so the counts and stagger match the 2D keyboard.
- [ ] `npx tsc --noEmit` passes. Commit.

### Task 2: The drawing (`scene.ts`)

**Interfaces — Consumes:** Task 1. **Produces:**
```ts
export type Label = { id: string; no: number; x: number; y: number; ax: number; ay: number; hidden: boolean }
export function createScene(canvas: HTMLCanvasElement, opts: {
  reducedMotion: boolean; onFrame: (labels: Label[]) => void; onLanded: () => void }): {
  resize(w: number, h: number): void
  rotateBy(dYaw: number, dPitch: number, animate?: boolean): void
  reset(): void
  skipAssembly(): void
  pick(x: number, y: number): string | null
  select(id: string | null): void
  dispose(): void }
```
- [ ] Fills `MeshBasicMaterial(--paper)` with polygon offset; creases as `LineSegments2` (1.3px); silhouettes as an inverted hull extruded in screen space (2.4px); selected part in `--ribbon`.
- [ ] Orthographic camera on a yaw/pitch sphere fitted to `RADIUS`; renders on demand only.
- [ ] Assembly: each part slides from `exploded` to home, start = order × 0.13s, 0.7s each, `--ease` curve; `onLanded` when the bell lands.
- [ ] Labels: anchors projected each frame, spread on a ring outside the machine, `hidden` when another part is in front (leader drawn dashed, the patent convention).
- [ ] `dispose()` frees geometries, materials, renderer and calls `forceContextLoss()`.

### Task 3: Figure and orbit (`Figure.tsx`, `useOrbit.ts`)
- [ ] `Figure` mounts the canvas, the SVG leader lines and the number buttons; exposes `onSelect`.
- [ ] `useOrbit`: pointer drag (4px threshold, `touch-action: none`), arrow keys, skip assembly on first input.
- [ ] Default export so it can be `lazy()`-loaded.

### Task 4: The sheet and the button
**Files:** `AnatomySheet.tsx`, `AnatomyButton.tsx`, `anatomy.css`; Modify `WritingPhase.tsx`, `src/main.tsx` or `App.tsx` CSS import.
- [ ] `<dialog>` opened with `showModal()` (makes the writing page inert, so no keystroke reaches the textarea); `cancel` (Esc) and × close; on close, focus the hidden input.
- [ ] Header, RESET, legend (buttons), note panel with `aria-live="polite"`; phone layout with `PARTS` toggle.
- [ ] `Figure` loaded with `lazy()`; fallback `DRAWING…`.
- [ ] Button in `.writing-actions` on the left, cancels mousedown.
- [ ] Check (Review Focus 1, 2) in Chrome. Commit.

### Task 5: Verify and document
- [ ] Puppeteer script: three.js chunk not requested before click; assembly completes and skip works; reduced motion; drag/keys/limits/reset; select via drawing, number and legend; drag-then-release doesn't select; Esc/× return typing with draft intact; 20 open/close cycles without errors; screenshots 1440×900, 1280×720, 390×844 at front/side/top/¾.
- [ ] `npm run build` passes.
- [ ] Update `CLAUDE.md` (stack line, layout, feel table). Commit.
