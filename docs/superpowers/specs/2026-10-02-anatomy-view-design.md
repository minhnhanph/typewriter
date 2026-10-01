# Anatomy view: the machine as a patent drawing

**Date:** 2026-10-02 · **Status:** awaiting review

## Intent

A drawing sheet that shows the typewriter the way a patent does: ink outlines
on paper, every part numbered. The user can turn it to any angle and click a
part to read what it does, both on a real machine and in this site.

It's a side door, not a step in the journey. It explains the machine you are
typing on, then gets out of the way.

Decided with the user:

- Entry is an **icon button in the bottom-left corner**, mirroring the sound
  toggle in the top right.
- Shown on the **writing screen only.**
- **Free rotation in 3D**, not fixed figures. Cost accepted: three.js becomes
  the second runtime dependency, and the work is roughly 3–4x that of fixed
  views.
- The machine is **built in code from simple shapes** (approach A), not a
  downloaded model and not a hand-rolled SVG projection.
- Each note covers **the real mechanism, plus one line on how this site copies
  it.**
- It opens by **assembling itself** from an exploded view.

## What the user sees and does

### The button
- Bottom left, fixed, the same size and quiet style as the sound toggle.
- Icon: a tiny line drawing of the machine with one leader line ending in a
  dot, like a patent callout. `aria-label="Typewriter anatomy"`.
- Cancels the default mousedown, like every clickable thing on this screen
  (the focus gotcha), so pressing it never silently stops typing.

### The sheet
- Opens full-screen over the writing page, on `--paper`.
- Framed like a patent sheet: a thin ruled border inset from the edges and a
  header in `--display` capitals: `TYPEWRITER · ANATOMY` on the left,
  `SHEET 1 OF 1` and `FIG. 1` on the right.
- The 3D machine fills the middle. Close (×) sits top right, inside the border.
- A **parts legend** sits in the bottom-left corner of the sheet, as on a real
  patent: the numbers and names in a short column.
- On phones the legend collapses to a `PARTS` toggle, and notes slide up from
  the bottom instead of sitting in the margin.

### Opening: it assembles itself
1. The parts start spread apart along their own directions (an exploded
   figure), each with its number already showing.
2. Over about 2 seconds they slide home in build order: frame and body, keys,
   typebars, ribbon, carriage, platen, bell last.
3. When the bell lands, it plays the existing `playBell()`. This only sounds if
   the user has turned sound on, since sound starts off.
4. It rests at a three-quarter view (turned about 30° and looking down about
   20°), ready to drag.
- Any click, drag or key during the assembly skips to the finished machine.
- With `prefers-reduced-motion` the machine appears already assembled, with no
  bell.
- Motion uses `--ease`.

### Turning it
- Drag (mouse or one finger) to rotate. Turning left and right is unlimited.
  Tilting up and down stops before the machine goes upside down (about −10° to
  +80°), so you can't lose it.
- Arrow keys rotate in 15° steps.
- A `RESET` control in the header returns to the three-quarter view.
- No zoom in this version.
- A press that moves more than 4px counts as a drag, not a click.

### The parts and their notes
Patent drawings number parts in even steps; this does too. Each part has a name,
a short note on the real mechanism, and a line on this site:

| No. | Part | Real machine | This site |
| --- | --- | --- | --- |
| 10 | Platen | The hard rubber roller the paper wraps around; the typebars strike against it. Its knob turns it by hand. | Scroll or drag the page to read back, like turning the knob. The next keystroke rolls it home. |
| 12 | Carriage | Carries the platen and slides one step left after every letter, so the printing point never moves. | The caret never moves; the paper and carriage do, both worked out from your column. |
| 14 | Carriage return lever | Pushed at the end of a line: it rolls the paper up one line and throws the carriage back to the left. | Enter. |
| 16 | Margin stops | Sliding stops on the rail that set where lines start and where the carriage locks. | The right margin is a hard stop at column 58. Only pasted text wraps. |
| 18 | Bell | Rings a few characters before the margin, so you can finish the word. | Rings 7 columns before the stop. |
| 20 | Ribbon and spools | An inked fabric ribbon wound between two spools, often black over red. | The red accent across this site is the red half of that ribbon. The spools turn a little with each keystroke. |
| 22 | Type guide | The small slot at the printing point that steadies each typebar as it lands. | The one fixed point on the page where every letter lands. |
| 24 | Typebars | A fan of levers in the typebasket, each with a letter slug on its tip that swings up to the platen. | Each letter lands 80 ms after its key goes down, as the bar arrives. |
| 26 | Keys | Each key is a lever that throws its typebar. The rows stagger and rise in steps. | Your keyboard presses the drawn keys. |
| 28 | Shift key | Lifts the typebasket so the upper half of each slug strikes: capitals. | Holding Shift shows the capitals on the drawn keys. |
| 30 | Back Spacer | Moves the carriage back one space. It never erased anything. | Here it erases, and steps back up a line. A deliberate kindness. |
| 32 | Space bar | Moves the carriage on one space without striking. | Space. |

The wording above is the starting draft. It lives in the parts list (below) and
can be edited there.

### Selecting a part
- Click a part on the drawing, its number, or its legend entry.
- The selected part's outline and number turn `--ribbon`, and its note opens in
  the right margin (desktop) or a bottom panel (phone): number and name in
  `--display` capitals, the real-machine paragraph, then the site line in
  `--annotation` italic, set off below it.
- Clicking empty paper, or the same part again, clears the selection.
- Keyboard: Tab moves through the legend; Enter selects. The note is announced
  to screen readers. This is the accessible route to every note, because a 3D
  canvas can't be tabbed through.
- Hovering a part on desktop shows a pointer cursor and darkens its number.

### Closing
- × or Esc closes it. Focus goes straight back to the writing input, so typing
  resumes with no extra click.
- The draft is untouched. The sheet only reads the drawing; it never touches
  `useLocalDraft`, so the destruction promise is unaffected.
- The writing screen keeps its scroll position and carriage position.

## How it's built

### Loaded only when opened
`AnatomySheet` and three.js are loaded with a dynamic `import()` the first time
the button is pressed. The writing screen's download doesn't change. While the
first load is in flight the sheet shows its border and header with a quiet
`DRAWING…` in the figure area.

### Files
```
src/features/anatomy/
  AnatomyButton.tsx    the bottom-left icon button
  AnatomySheet.tsx     the sheet: border, header, legend, note panel, close
  parts.ts             ← the machine as data (the one list to edit)
  scene.ts             three.js: build meshes from parts.ts, outline, render, pick
  assemble.ts          the opening animation: exploded → home, in build order
  useOrbit.ts          drag / arrow-key rotation with the tilt limits
  anatomy.css          the sheet's styles, tokens only
```
`WritingPhase.tsx` gains the button and an `open` state. Nothing else changes.

### The machine as data (`parts.ts`)
Each part is one entry:
- `no`, `name`, `real`, `site`: the number and note text.
- `shapes`: boxes, cylinders and rings, with sizes, positions and rotations
  relative to the part's home. Primitives only, no model files.
- `exploded`: the offset it starts from in the opening.
- `order`: when it lands in the assembly.
- `anchor`: the point its number's leader line attaches to.

Proportions follow the existing 2D machine (`Typewriter.tsx`, `Keyboard.tsx`)
so the two read as the same typewriter: round keycaps in staggered rows on an
arc, end keys riding higher (guideline 2). Non-numbered structure (frame, body
shell) is also in the list, with no number and no note.

Adding or changing a part means editing this file only.

### The drawing look (`scene.ts`)
- No lights, no shading, no shadows (guideline 1).
- Every shape is filled flat with `--paper` so it hides whatever is behind it.
  Lines behind solid parts disappear, as on a patent drawing.
- Outlines in `--ink` come in two kinds: crease edges (where faces meet at an
  angle) and silhouettes. Silhouettes use an inverted hull, a slightly larger
  back-facing copy drawn in ink, so round parts like the platen and keycaps
  get a clean outline from every angle.
- Selected part: its outlines switch to `--ribbon`.
- Colours are read from the CSS tokens with `getComputedStyle` at mount. No hex
  in the scene code (guideline 4).
- The renderer keeps a transparent background over the page's `--paper`, so
  the existing grain shows through.
- It only renders when something changes (drag, assembly, selection, resize),
  not continuously.

### Numbers and leader lines
These are HTML/SVG elements laid over the canvas, not 3D text. Each frame,
every part's `anchor` is projected to the screen. The number sits a fixed
distance out from the machine's centre along that direction, with a thin
`--stamp` leader line to the anchor, in patent-note style. They stay crisp and
use the existing fonts.

### Picking
A three.js raycaster against the fill meshes on pointer-up (if it wasn't a
drag), mapped back to the owning part.

### Teardown
Closing disposes the renderer, geometries and materials, so opening and closing
repeatedly doesn't leak memory.

## Checking it works

Driven in real Chrome with `puppeteer-core`, as with the rest of the project:

- The writing screen does **not** request the three.js chunk until the button
  is pressed.
- Opening runs the assembly to the end; a click mid-assembly skips it.
- With reduced motion emulated, it appears assembled immediately.
- Drag rotates; arrow keys rotate; tilt stops at its limits; RESET returns to
  the three-quarter view.
- Every part can be selected three ways (drawing, number, legend) and shows its
  own note; clicking empty paper clears it.
- Esc and × close it; the next keystroke types into the draft with no click;
  the draft text and carriage position are unchanged.
- Open and close 10 times in a row: no errors, no growing canvas count.
- Screenshots at 1440×900, a short laptop (1280×720) and 390×844 phone, from
  front, side, top and the three-quarter view, checked by eye for a
  drawn (not rendered) look.
- `npm run build` passes.

## Not in this version

- Zoom.
- A "take it apart" toggle to re-explode the machine (easy later, since the
  exploded positions already exist).
- The button on any screen other than Write.
- Animating parts in action (a typebar swinging, the bell striking) inside the
  drawing.

## Docs to update when built

- `CLAUDE.md`: layout tree, the new dependency in the stack line, and a row in
  "Where the feel lives" for the opening animation and rotation limits.
