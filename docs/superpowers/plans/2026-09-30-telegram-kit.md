# Telegram Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the four screens with telegram-era parts (header strip, counter tickets, ticker tape, rubber stamp, receipt, patent labels) without touching the character grid or the destroyers' game logic.

**Architecture:** Every new part is a small presentational piece living beside the screen that uses it. The only interface change is an optional `onProgress` callback on destroyers plus two new registry fields (`short`, `Mark`). All colours and fonts come from tokens in `src/styles/base.css`.

**Tech Stack:** Vite + React 19 + TypeScript, plain CSS. Verification with `puppeteer-core` (already in `node_modules`, drives the installed Chrome).

**Spec:** `docs/superpowers/specs/2026-09-30-telegram-kit-design.md`

## Global Constraints

- React is the only runtime dependency. Do not add npm packages. The font is a local file.
- No hex colours outside the `:root` block of `src/styles/base.css`. Mask gradients use the keywords `black` / `transparent`.
- The user's text is never uppercased. Only printed parts (labels, stamp, ticker, ticket names) are capitals.
- Flat, not shaded: no drop shadows or gradients on new parts.
- One easing curve: `var(--ease)`. The global `prefers-reduced-motion` rule in `base.css` must keep covering new animation.
- Nothing on the writing screen may take focus on click (see `WritingPhase.keepFocus`).
- `core/text.ts`, draft deletion timing in `App.tsx`, and the game rules inside `snake.tsx` / `fire.tsx` are not changed.
- `npm run build` must pass after every task.

## Review Focus

1. **Snake left on manual with no key pressed** — the ticker must still count correctly once "Finish it for me" is pressed, and the phase must end. Covered by the Task 5 stress run, which presses that button.
2. **Touch devices** — the snake runs itself and the ticker shows the "watching" instruction. Covered by the Task 5 touch run.
3. **A very long entry** (a full page) — the column scale plus ticker must not push the grid off screen. Covered by the Task 5 on-screen assertion.
4. **Reduced motion** — the stamp must be visible almost immediately rather than stuck invisible. Covered by the Task 6 reduced-motion check.
5. **Clicking the new header strip or patent labels while writing** — typing must continue. Covered by the Task 2 and Task 3 focus checks.

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/assets/fonts/barlow-condensed-700.woff2` | create | The condensed capitals font |
| `src/styles/base.css` | modify | New tokens, `@font-face`, shared `.printed` / `.fine-print`, stamp + receipt styles |
| `src/lib/time.ts` | create | `formatTime(date)` |
| `src/lib/useClock.ts` | create | Current time, ticking each minute |
| `src/features/writing/TelegramStrip.tsx` | create | The header strip over the page |
| `src/features/writing/WritingPhase.tsx` | modify | Mount the strip, drop the old word count |
| `src/features/writing/Typewriter.tsx` | modify | Patent labels |
| `src/styles/writing.css` | modify | Strip + label styles |
| `src/features/destruction/types.ts` | modify | `short`, `Mark`, `onProgress` |
| `src/features/destruction/destroyers/snake.tsx` / `fire.tsx` | modify | Marks, `short`, progress reporting, drop own counters |
| `src/features/destruction/ChoosePhase.tsx` | modify | Counter tickets |
| `src/features/destruction/DestructionPhase.tsx` | modify | Ticker tape |
| `src/features/destruction/GridStage.tsx` | modify | Column scale |
| `src/styles/destruction.css` | modify | Ticket, ticker, ruler styles; remove old choice/HUD styles |
| `src/features/aftermath/Receipt.tsx` | create | The torn receipt and its data type |
| `src/features/aftermath/AftermathPhase.tsx` | modify | Stamp + receipt |
| `src/App.tsx` | modify | Carry filed time, method and message number to the aftermath |
| `CLAUDE.md` | modify | Tokens table, layout, design notes |

Verification scripts live in `.superpowers/checks/` (git-ignored). They sit inside the repo so `import 'puppeteer-core'` resolves from `node_modules`.

**Dev server:** start once with `npm run dev` in the background (http://localhost:5173) and leave it running for all tasks.

---

### Task 1: Tokens, font and shared label styles

**Files:**
- Create: `src/assets/fonts/barlow-condensed-700.woff2`
- Create: `.superpowers/checks/lib.mjs`, `.superpowers/checks/t1-font.mjs`
- Modify: `src/styles/base.css` (top of file and the `/* --- controls --- */` section)

**Interfaces:**
- Produces: CSS tokens `--stamp`, `--display`, `--annotation`; classes `.printed` (red condensed capitals) and `.fine-print` (tiny spaced capitals); the shared check helpers `open`, `seed`, `sleep`, `assert`, `shot` in `lib.mjs`.

- [ ] **Step 1: Write the check helpers**

`.superpowers/checks/lib.mjs`:

```js
import puppeteer from 'puppeteer-core'

export const URL = 'http://localhost:5173/'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function assert(cond, msg) {
  if (cond) console.log('ok:', msg)
  else {
    console.error('FAIL:', msg)
    process.exitCode = 1
  }
}

/** A fresh page with an empty draft. `touch` emulates a phone. */
export async function open({ width = 1280, height = 900, touch = false, reducedMotion = false } = {}) {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
  const page = await browser.newPage()
  await page.setViewport({ width, height, hasTouch: touch, isMobile: touch })
  if (reducedMotion) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle0' })
  return { browser, page }
}

/** Put text in the draft without typing it, then reload onto the writing screen. */
export async function seed(page, text) {
  await page.evaluate((t) => localStorage.setItem('typewriter:draft', t), text)
  await page.reload({ waitUntil: 'networkidle0' })
}

export async function shot(page, name) {
  await page.screenshot({ path: new globalThis.URL(`./shots/${name}.png`, import.meta.url).pathname })
}
```

Then run: `mkdir -p .superpowers/checks/shots`

- [ ] **Step 2: Write the failing font check**

`.superpowers/checks/t1-font.mjs`:

```js
import { open, assert } from './lib.mjs'

const { browser, page } = await open()
const loaded = await page.evaluate(async () => {
  const faces = await document.fonts.load('700 16px "Barlow Condensed"')
  return faces.length
})
assert(loaded > 0, 'Barlow Condensed 700 loads from the bundle')
const stamp = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--stamp').trim(),
)
assert(stamp === '#2f4a6b', '--stamp token exists')
await browser.close()
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node .superpowers/checks/t1-font.mjs`
Expected: `FAIL: Barlow Condensed 700 loads from the bundle` and `FAIL: --stamp token exists`

- [ ] **Step 4: Download the font**

```bash
mkdir -p src/assets/fonts
curl -sL -o src/assets/fonts/barlow-condensed-700.woff2 \
  https://cdn.jsdelivr.net/fontsource/fonts/barlow-condensed@latest/latin-700-normal.woff2
file src/assets/fonts/barlow-condensed-700.woff2
```

Expected: `Web Open Font Format (Version 2)`. Barlow is under the SIL Open Font License, which allows bundling.

- [ ] **Step 5: Add the font face and tokens**

In `src/styles/base.css`, above `:root {`:

```css
/* The printed parts of the telegram -- TELEGRAM, ticket names, the stamp.
   Bundled rather than loaded from a font service, so the site makes no
   outside requests. */
@font-face {
  font-family: 'Barlow Condensed';
  src: url('../assets/fonts/barlow-condensed-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

Replace the `/* The machine itself ... */` block (the `--machine` and `--machine-rail` lines) with:

```css
  /* Rubber-stamp blue: the NOT DELIVERED stamp and the patent labels on the
     machine. The only cool colour in the palette, so it reads as "office". */
  --stamp: #2f4a6b;
```

After the `--mono` line add:

```css
  /* Condensed capitals for anything printed on a form. Never the user's words. */
  --display: 'Barlow Condensed', 'Arial Narrow', 'Helvetica Neue', sans-serif;
  /* The italic notes on a patent drawing. */
  --annotation: Georgia, 'Times New Roman', serif;
```

- [ ] **Step 6: Add the shared label classes**

In `src/styles/base.css`, directly under the `/* --- controls --- */` comment:

```css
/* Printed on the form: the red condensed capitals of a telegram blank. */
.printed {
  font-family: var(--display);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ribbon);
  line-height: 1;
}

/* The tiny spaced capitals that label a box on a form. */
.fine-print {
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
```

- [ ] **Step 7: Run the check and the build**

Run: `node .superpowers/checks/t1-font.mjs && npm run build`
Expected: two `ok:` lines; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/assets/fonts src/styles/base.css
git commit -m "Add stamp blue, the condensed display font and printed-label styles"
```

---

### Task 2: Telegram header strip on the writing screen

**Files:**
- Create: `src/lib/time.ts`, `src/lib/useClock.ts`, `src/features/writing/TelegramStrip.tsx`
- Create: `.superpowers/checks/t2-strip.mjs`
- Modify: `src/features/writing/WritingPhase.tsx`, `src/styles/writing.css`

**Interfaces:**
- Consumes: `.printed`, `.fine-print` (Task 1).
- Produces: `formatTime(date: Date): string` in `src/lib/time.ts` (used again in Task 6); `useClock(): Date`; `<TelegramStrip words={number} />`.

- [ ] **Step 1: Write the failing check**

`.superpowers/checks/t2-strip.mjs`:

```js
import { open, assert, sleep, shot } from './lib.mjs'

const { browser, page } = await open()
await page.keyboard.type('the quick brown fox')
await sleep(200)
const boxes = await page.$$eval('.telegram-box b', (els) => els.map((e) => e.textContent))
assert(boxes[0] === '4', `WORDS box shows 4 (got ${boxes[0]})`)
assert(/\d{1,2}:\d{2}/.test(boxes[1] ?? ''), `FILED box shows a time (got ${boxes[1]})`)
assert((await page.$('.word-count')) === null, 'old word count beside Done is gone')

// Clicking the strip must not steal focus from the hidden textarea.
await page.click('.telegram-strip')
await page.keyboard.type(' jumps')
await sleep(200)
const words = await page.$eval('.telegram-box b', (e) => e.textContent)
assert(words === '5', `typing continues after clicking the strip (got ${words})`)
await shot(page, 't2-write-desktop')
await browser.close()

const phone = await open({ width: 390, height: 844 })
await phone.page.keyboard.type('hi')
await shot(phone.page, 't2-write-phone')
await phone.browser.close()
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node .superpowers/checks/t2-strip.mjs`
Expected: `FAIL: WORDS box shows 4 (got undefined)` and further FAILs.

- [ ] **Step 3: Add the time helpers**

`src/lib/time.ts`:

```ts
/** "11:42 PM", in the reader's own locale. Used on the form and the receipt. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
```

`src/lib/useClock.ts`:

```ts
import { useEffect, useState } from 'react'

/**
 * The current time, updated on the minute -- for the FILED box. Timed to the
 * minute boundary rather than polled, so it flips when the real clock does.
 */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: number
    const schedule = () => {
      const untilNextMinute = 60_000 - (Date.now() % 60_000)
      timer = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, untilNextMinute)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  return now
}
```

- [ ] **Step 4: Add the strip**

`src/features/writing/TelegramStrip.tsx`:

```tsx
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
```

- [ ] **Step 5: Mount it and drop the old count**

In `src/features/writing/WritingPhase.tsx`:

Add the import after the `Paper` import:

```tsx
import { TelegramStrip } from './TelegramStrip'
```

Directly above `<Paper lines=...`, add:

```tsx
      <TelegramStrip words={words} />
```

Replace the `writing-actions` block with:

```tsx
        <div className="writing-actions">
          <button className="button button-primary" disabled={words === 0} onClick={onDone}>
            Done
          </button>
        </div>
```

- [ ] **Step 6: Style it**

In `src/styles/writing.css`:

Change `.paper`'s `padding: 4rem 1.5rem 2rem;` to `padding: 1.5rem 1.5rem 2rem;`.

After the `.paper::-webkit-scrollbar` rule add:

```css
/* The header of a telegram blank, the width of the page below it. */
.telegram-strip {
  width: calc(var(--cols) * 1ch);
  max-width: calc(100% - 3rem);
  margin-top: 3rem;
  display: flex;
  align-items: stretch;
  border-top: 2px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.telegram-title {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 1.35rem;
  padding: 0.35rem 0 0.25rem;
}

.telegram-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.1rem;
  min-width: 6.5rem;
  padding: 0.25rem 0.75rem;
  border-left: 1px solid var(--ink);
}

.telegram-box b {
  font-weight: 400;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}
```

In `.writing-actions`, change `justify-content: space-between;` to `justify-content: flex-end;` and update its comment to `/* Done sits at the right edge of the page. */`. Delete the whole `.word-count` rule.

Inside the `@media (max-width: 640px)` block, replace `.paper { padding-top: 2.5rem; }` with:

```css
  .telegram-strip {
    margin-top: 2rem;
  }
  .telegram-box {
    min-width: 0;
    padding: 0.25rem 0.5rem;
  }
  .paper {
    padding-top: 1rem;
  }
```

- [ ] **Step 7: Run the check and the build**

Run: `node .superpowers/checks/t2-strip.mjs && npm run build`
Expected: four `ok:` lines; build succeeds. Open both screenshots in `.superpowers/checks/shots/` and confirm the strip sits flush with the text column and nothing overlaps at 390px.

- [ ] **Step 8: Commit**

```bash
git add src/lib/time.ts src/lib/useClock.ts src/features/writing src/styles/writing.css
git commit -m "Put a telegram header strip over the page, with live word count and time"
```

---

### Task 3: Patent labels on the typewriter

**Files:**
- Create: `.superpowers/checks/t3-labels.mjs`
- Modify: `src/features/writing/Typewriter.tsx` (constants near `TYPE_BARS`, and the returned JSX), `src/styles/writing.css`

**Interfaces:**
- Consumes: `--stamp`, `--annotation` (Task 1).
- Produces: nothing used by later tasks.

- [ ] **Step 1: Write the failing check**

`.superpowers/checks/t3-labels.mjs`:

```js
import { open, assert, sleep, shot } from './lib.mjs'

const { browser, page } = await open()
const visible = await page.$$eval('.tw-note', (els) =>
  els.filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent),
)
assert(visible.length === 3, `three patent labels on desktop (got ${visible.join(', ')})`)

// Clicking a label must not stop typing.
await page.click('.tw-note-spacebar')
await page.keyboard.type('still typing')
await sleep(200)
const words = await page.$eval('.telegram-box b', (e) => e.textContent)
assert(words === '2', `typing continues after clicking a label (got ${words})`)
await shot(page, 't3-labels-desktop')
await browser.close()

const phone = await open({ width: 390, height: 844 })
const phoneVisible = await phone.page.$$eval('.tw-note', (els) =>
  els.filter((e) => getComputedStyle(e).display !== 'none').length,
)
assert(phoneVisible === 0, 'labels hidden on a phone')
await phone.browser.close()
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node .superpowers/checks/t3-labels.mjs`
Expected: `FAIL: three patent labels on desktop (got )`

- [ ] **Step 3: Add the labels**

In `src/features/writing/Typewriter.tsx`, after `const TYPE_BARS = 21` add:

```tsx
/**
 * The italic notes a patent drawing pins to the parts of the machine. They
 * only label -- positions live in CSS, one class per note.
 */
const PATENT_NOTES = [
  { id: 'carriage', text: 'carriage' },
  { id: 'platen', text: 'fig. 1 — platen' },
  { id: 'spacebar', text: 'space bar' },
]
```

Inside the returned `<div className="typewriter" aria-hidden="true">`, as its last children (after the closing `</div>` of `tw-keyboard`), add:

```tsx
      {PATENT_NOTES.map((note) => (
        <span key={note.id} className={`tw-note tw-note-${note.id}`}>
          {note.text}
        </span>
      ))}
```

- [ ] **Step 4: Style them**

In `src/styles/writing.css`:

In `.writing-machine`, change `padding: 1rem 1.5rem 2rem;` to `padding: 2.25rem 1.5rem 2rem;` (room for the notes above the platen).

In `.typewriter`, add `position: relative;` after `user-select: none;`.

After the `.tw-spacebar.is-pressed span` rule add:

```css
/* --- patent-drawing notes --- */

/* Italic labels with thin pointer lines, in stamp blue, as on a patent
   drawing. Decoration only: they never take a click. */
.tw-note {
  position: absolute;
  font-family: var(--annotation);
  font-style: italic;
  font-size: 0.72rem;
  line-height: 1;
  color: var(--stamp);
  white-space: nowrap;
  pointer-events: none;
}

.tw-note::after {
  content: '';
  position: absolute;
  border-color: var(--stamp);
  border-style: solid;
  border-width: 0;
}

/* Above the rail, each with a short drop line down to it. */
.tw-note-carriage,
.tw-note-platen {
  top: -1.75rem;
}
.tw-note-carriage {
  left: 3rem;
}
.tw-note-platen {
  right: 1.5rem;
}
.tw-note-carriage::after,
.tw-note-platen::after {
  top: calc(100% + 0.2rem);
  left: 0.6rem;
  height: 1rem;
  border-left-width: 1px;
}

/* Beside the space bar, with a short line reaching in to it. */
.tw-note-spacebar {
  left: calc(50% + var(--key) * 4.75 + 1.6rem);
  bottom: calc(var(--key) * 0.42 - 0.36rem);
}
.tw-note-spacebar::after {
  right: calc(100% + 0.25rem);
  top: 50%;
  width: 1.2rem;
  border-top-width: 1px;
}
```

Inside the `@media (max-width: 640px)` block add:

```css
  /* No room beside a phone-sized keyboard; the notes would collide. */
  .tw-note {
    display: none;
  }
```

- [ ] **Step 5: Run the check, look, and build**

Run: `node .superpowers/checks/t3-labels.mjs && npm run build`
Expected: three `ok:` lines; build succeeds. Open `shots/t3-labels-desktop.png`: each pointer line must touch its part (rail for carriage/platen, the space bar's right end for space bar) and no note may overlap the text page. Nudge the `top` / `left` / `right` / `bottom` values above if not, and re-run.

- [ ] **Step 6: Commit**

```bash
git add src/features/writing/Typewriter.tsx src/styles/writing.css
git commit -m "Label the typewriter like a patent drawing"
```

---

### Task 4: Counter tickets on the choose screen

**Files:**
- Create: `.superpowers/checks/t4-tickets.mjs`
- Modify: `src/features/destruction/types.ts`, `src/features/destruction/destroyers/snake.tsx` (bottom export), `src/features/destruction/destroyers/fire.tsx` (bottom export), `src/features/destruction/ChoosePhase.tsx`, `src/styles/destruction.css` (choose section)

**Interfaces:**
- Consumes: `.printed`, `.fine-print` (Task 1).
- Produces: `Destroyer.short: string` (e.g. `'Snake'`, used again in Task 6 for the receipt's method), `Destroyer.Mark: ComponentType` (a line drawing using `currentColor`).

- [ ] **Step 1: Write the failing check**

`.superpowers/checks/t4-tickets.mjs`:

```js
import { open, seed, assert, shot } from './lib.mjs'

for (const [width, height, name] of [[1280, 900, 'desktop'], [390, 844, 'phone']]) {
  const { browser, page } = await open({ width, height })
  await seed(page, 'a short message to nobody')
  await page.click('.button-primary')
  await page.waitForSelector('.ticket')
  const names = await page.$$eval('.ticket-name', (els) => els.map((e) => e.innerText))
  assert(names.join(',') === 'SNAKE,FIRE', `${name}: tickets read SNAKE, FIRE (got ${names})`)
  const tops = await page.$$eval('.ticket', (els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
  if (name === 'desktop') assert(tops[0] === tops[1], 'desktop: tickets side by side')
  else assert(tops[0] !== tops[1], 'phone: tickets stacked')
  // The sound toggle comes first in tab order; a ticket must follow within a few presses.
  let focused = ''
  for (let i = 0; i < 3 && !focused.includes('ticket'); i++) {
    await page.keyboard.press('Tab')
    focused = await page.evaluate(() => document.activeElement?.className ?? '')
  }
  assert(focused.includes('ticket'), `${name}: tickets are reachable by Tab (got "${focused}")`)
  await shot(page, `t4-choose-${name}`)
  await page.click('.ticket-fire')
  await page.waitForSelector('.phase-destroy')
  assert(true, `${name}: clicking a ticket starts the destruction`)
  await browser.close()
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node .superpowers/checks/t4-tickets.mjs`
Expected: times out waiting for `.ticket` (TimeoutError). That is the failure.

- [ ] **Step 3: Extend the destroyer contract**

In `src/features/destruction/types.ts`, in `type Destroyer`, after `name: string` add:

```ts
  /** One word, printed large on its ticket and on the receipt. */
  short: string
```

and after `tagline: string` add:

```ts
  /** A small line drawing for its ticket. Draw with `currentColor`. */
  Mark: ComponentType
```

- [ ] **Step 4: Give the snake and fire their marks**

In `src/features/destruction/destroyers/snake.tsx`, above `export const snakeDestroyer`, add:

```tsx
/** The ticket drawing: one S-curve of body and a head. */
function SnakeMark() {
  return (
    <svg viewBox="0 0 80 40" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M8 28 Q18 12 28 24 T48 24 T66 18" />
      <circle cx="68" cy="17" r="3" />
    </svg>
  )
}
```

and in `snakeDestroyer`, after `name: 'Feed it to the snake',` add `short: 'Snake',`, and after the `tagline` line add `Mark: SnakeMark,`.

In `src/features/destruction/destroyers/fire.tsx`, above `export const fireDestroyer`, add:

```tsx
/** The ticket drawing: a single flame on a ruled line. */
function FireMark() {
  return (
    <svg
      viewBox="0 0 80 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M40 36 C28 30 30 20 36 14 C36 22 42 22 42 16 C42 10 46 6 46 4 C54 14 54 30 40 36 Z" />
      <path d="M24 37 H56" strokeWidth="1.4" style={{ stroke: 'var(--ink)' }} />
    </svg>
  )
}
```

and in `fireDestroyer`, after `name: 'Give it to the fire',` add `short: 'Fire',`, and after the `tagline` line add `Mark: FireMark,`.

- [ ] **Step 5: Render tickets**

Replace the body of `src/features/destruction/ChoosePhase.tsx`'s returned JSX with:

```tsx
    <div className="phase phase-choose">
      <p className="choose-count">
        Class of service · {words === 1 ? '1 word' : `${words} words`}
      </p>
      <h1 className="choose-title">How should it go?</h1>

      <div className="choose-options">
        {DESTROYERS.map((destroyer, i) => {
          const { Mark } = destroyer
          return (
            <button
              key={destroyer.id}
              className={`ticket ticket-${destroyer.id}`}
              aria-label={`${destroyer.name}. ${destroyer.tagline}`}
              onClick={() => onChoose(destroyer.id)}
            >
              {/* Lettered in registry order, so a third destroyer is Service C. */}
              <span className="fine-print">Service {String.fromCharCode(65 + i)}</span>
              <span className="ticket-mark" aria-hidden="true">
                <Mark />
              </span>
              <span className="printed ticket-name">{destroyer.short}</span>
              <span className="ticket-perforation" aria-hidden="true" />
              <span className="ticket-tagline">{destroyer.tagline}</span>
            </button>
          )
        })}
      </div>

      <button className="button button-ghost" onClick={onBack}>
        Not yet — keep writing
      </button>
    </div>
```

Update the component's doc comment to add a line: `The choices are counter tickets from a telegraph office.`

- [ ] **Step 6: Style tickets, remove the old cards**

In `src/styles/destruction.css`, delete the rules `.choice`, `.choice:hover`, `.choice-name`, `.choice-tagline`, `.choice-mark`, `.choice-mark-snake`, `.choice-mark-fire`, and in their place add:

```css
/* A counter ticket from a telegraph office: flat card, round notches punched
   out of both sides, a perforation above the small print. */
.ticket {
  --notch: 9px;
  width: 220px;
  padding: 1.1rem 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--surface-edge);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
  /* Real holes, cut with a mask, so the paper grain shows through them. */
  mask:
    radial-gradient(circle var(--notch) at 0 50%, transparent 98%, black) left / 51% 100% no-repeat,
    radial-gradient(circle var(--notch) at 100% 50%, transparent 98%, black) right / 51% 100% no-repeat;
  transition:
    border-color 0.25s var(--ease),
    transform 0.25s var(--ease);
}

.ticket:hover {
  transform: translateY(-3px);
  border-color: var(--ink-dim);
}

/* The mask would clip an outline, so focus is drawn inside the edge. */
.ticket:focus-visible {
  outline: none;
  border-color: var(--ribbon);
  box-shadow: inset 0 0 0 1px var(--ribbon);
}

.ticket-mark svg {
  display: block;
  width: 84px;
  height: 42px;
}

.ticket-snake .ticket-mark {
  color: var(--snake);
}

.ticket-fire .ticket-mark {
  color: var(--ember);
}

.ticket-name {
  font-size: 1.6rem;
}

.ticket-perforation {
  align-self: stretch;
  margin: 0.2rem -1.25rem 0.1rem;
  border-top: 1.5px dashed var(--surface-edge);
}

.ticket-tagline {
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--ink-dim);
}
```

- [ ] **Step 7: Run the check, look, and build**

Run: `node .superpowers/checks/t4-tickets.mjs && npm run build`
Expected: all `ok:` lines for both widths; build succeeds. Open `shots/t4-choose-desktop.png` and `t4-choose-phone.png`: notches visible on both sides, perforation spans the full ticket width.

- [ ] **Step 8: Commit**

```bash
git add src/features/destruction src/styles/destruction.css
git commit -m "Turn the two destroyers into telegraph counter tickets"
```

---

### Task 5: Ticker tape and column scale on the destruction screen

**Files:**
- Create: `.superpowers/checks/t5-destroy.mjs`
- Modify: `src/features/destruction/types.ts`, `src/features/destruction/DestructionPhase.tsx`, `src/features/destruction/GridStage.tsx`, `src/features/destruction/destroyers/snake.tsx`, `src/features/destruction/destroyers/fire.tsx`, `src/styles/destruction.css`

**Interfaces:**
- Consumes: `Destroyer.short` exists (Task 4) but is not used here.
- Produces: `DestroyerProps.onProgress?: (destroyed: number, total: number) => void`. Destroyers call it whenever their destroyed count may have changed. It only reports and never decides when the phase ends.

- [ ] **Step 1: Write the failing stress check**

`.superpowers/checks/t5-destroy.mjs`:

```js
import { open, seed, assert, sleep, shot } from './lib.mjs'

const SHAPES = {
  'one word': 'goodbye',
  'full page': Array.from({ length: 22 }, (_, i) => `line ${i} of a long letter that fills the whole page up`).join(' '),
  'spaced letters': 'a b c d e f g h i j k l m',
  'long word': 'x'.repeat(150),
}
const RUNS = 3

async function destroy({ text, destroyer, touch, label }) {
  const { browser, page } = await open(touch ? { width: 390, height: 844, touch: true } : {})
  await seed(page, text)
  await page.click('.button-primary')
  await page.waitForSelector(`.ticket-${destroyer}`)
  await page.click(`.ticket-${destroyer}`)
  await page.waitForSelector('.ticker')

  const total = text.replace(/\s/g, '').length
  const ticker = await page.$eval('.ticker', (e) => e.innerText)
  // The destroyer may already have taken a bite by now, so check the total only.
  assert(ticker.includes(` / ${total}`), `${label}: ticker counts out of ${total}`)
  const box = await page.$eval('.grid-stage', (e) => e.getBoundingClientRect().bottom)
  const ruler = await page.$eval('.grid-ruler', (e) => e.getBoundingClientRect().top)
  const vh = await page.evaluate(() => innerHeight)
  assert(ruler >= 0 && box <= vh, `${label}: ruler and grid fit on screen (${Math.round(ruler)}..${Math.round(box)} of ${vh})`)
  if (label.startsWith('snake · full page · run 1 · desktop')) await shot(page, 't5-snake-desktop')
  if (label.startsWith('fire · full page · run 1 · desktop')) await shot(page, 't5-fire-desktop')

  // Desktop snake starts in manual mode; hand it to the autopilot.
  const finish = await page.$('.destroy-hud .button-ghost')
  if (finish) await finish.click()

  let last = ''
  const started = Date.now()
  while (Date.now() - started < 120_000) {
    if (await page.$('.phase-aftermath')) break
    last = (await page.$eval('.ticker', (e) => e.innerText).catch(() => last)) || last
    await sleep(100)
  }
  const done = Boolean(await page.$('.phase-aftermath'))
  assert(done, `${label}: reached the aftermath in ${Math.round((Date.now() - started) / 1000)}s`)
  assert(last.includes(`${total} / ${total}`), `${label}: ticker ended at ${total} / ${total} (last: "${last.split('\n').join(' ')}")`)
  await browser.close()
}

for (const destroyer of ['snake', 'fire']) {
  for (const [shape, text] of Object.entries(SHAPES)) {
    for (let run = 1; run <= RUNS; run++) {
      await destroy({ text, destroyer, touch: false, label: `${destroyer} · ${shape} · run ${run} · desktop` })
    }
  }
  await destroy({ text: SHAPES['full page'], destroyer, touch: true, label: `${destroyer} · full page · touch` })
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node .superpowers/checks/t5-destroy.mjs`
Expected: TimeoutError waiting for `.ticker`.

- [ ] **Step 3: Add `onProgress` to the contract**

In `src/features/destruction/types.ts`, in `DestroyerProps`, after `onComplete` add:

```ts
  /**
   * Optional. Report how many characters are gone so far, for the ticker.
   * It only reports -- finishing is still decided by calling `onComplete`.
   */
  onProgress?: (destroyed: number, total: number) => void
```

- [ ] **Step 4: The ticker**

Replace the contents of `src/features/destruction/DestructionPhase.tsx` from `export function DestructionPhase` to the end with:

```tsx
export function DestructionPhase({ text, destroyerId, onComplete }: Props) {
  const isTouch = useIsTouch()
  const destroyer = findDestroyer(destroyerId)
  const [destroyed, setDestroyed] = useState(0)

  const grid = useMemo(() => buildGrid(layout(text, COLS).lines, COLS), [text])
  const reportProgress = useCallback((count: number) => setDestroyed(count), [])

  if (!destroyer) return null
  const { Component } = destroyer

  return (
    <div className="phase phase-destroy">
      {/* Ticker tape: the running count and how to operate the destroyer,
          printed the way a telegraph office would print a status line. */}
      <p className="ticker">
        <span>Transmission cancelled</span>
        <span>
          <em>
            {destroyed} / {grid.cells.length}
          </em>{' '}
          characters destroyed
        </span>
        <span>{isTouch ? destroyer.instructions.watching : destroyer.instructions.playable}</span>
      </p>
      <Component
        grid={grid}
        playable={!isTouch}
        onComplete={onComplete}
        onProgress={reportProgress}
      />
    </div>
  )
}
```

and change the first import line to:

```tsx
import { useCallback, useMemo, useState } from 'react'
```

- [ ] **Step 5: The snake reports and loses its own counter**

In `src/features/destruction/destroyers/snake.tsx`:

Change the signature to `function SnakeStage({ grid, playable, onComplete, onProgress }: DestroyerProps) {`.

After `completeRef.current = onComplete` add:

```tsx
  const progressRef = useRef(onProgress)
  progressRef.current = onProgress
```

Inside the interval, directly after `state.eaten++`, add:

```tsx
          progressRef.current?.(state.eaten, grid.cells.length)
```

Replace from `const state = game.current` to the end of the returned JSX with:

```tsx
  const state = game.current

  return (
    <>
      <GridStage grid={arena} className="stage-snake">
        {[...state.remaining.values()].map((cell) => (
          <span className="cell" key={cell.id} style={cellStyle(cell.row, cell.col)}>
            {cell.char}
          </span>
        ))}
        {state.body.map((segment, i) => (
          <div
            key={i}
            className={`snake-seg${i === 0 ? ' is-head' : ''}`}
            style={cellStyle(segment.row, segment.col)}
          />
        ))}
      </GridStage>

      {/* The count lives in the ticker now; only the hand-off button stays. */}
      {playable && !auto && (
        <div className="destroy-hud">
          <button className="button button-ghost" onClick={() => setAuto(true)}>
            Finish it for me
          </button>
        </div>
      )}
    </>
  )
```

Add `grid.cells.length` to the interval effect's dependency array: `[auto, rows, arena.cols, grid.cells.length]`.

- [ ] **Step 6: The fire reports and loses its own counter**

In `src/features/destruction/destroyers/fire.tsx`:

Change the signature to `function FireStage({ grid, onComplete, onProgress }: DestroyerProps) {`.

After `completeRef.current = onComplete` add:

```tsx
  const progressRef = useRef(onProgress)
  progressRef.current = onProgress
```

Inside the interval, directly before the final `render()`, add:

```tsx
      // A letter counts as destroyed the moment it catches.
      let intact = 0
      for (const letter of letters.values()) if (letter.phase === 'intact') intact++
      progressRef.current?.(grid.cells.length - intact, grid.cells.length)
```

Add `grid.cells.length` to that effect's dependency array: `[grid.rows, grid.cols, grid.cells.length]`.

Replace the lines

```tsx
  const remaining = [...letters.values()]
  const burnt = grid.cells.length - remaining.filter((l) => l.phase === 'intact').length
```

with `const remaining = [...letters.values()]`, and delete the whole `<div className="destroy-hud">…</div>` block after `</GridStage>`. If the fragment `<>…</>` now wraps only `GridStage`, remove the fragment.

- [ ] **Step 7: The column scale**

In `src/features/destruction/GridStage.tsx`, above `export function GridStage`, add:

```tsx
/** Where the typewriter's scale prints a number: 1, every tenth column, the last. */
function rulerMarks(cols: number): number[] {
  const tens = Array.from({ length: Math.floor(cols / 10) }, (_, i) => (i + 1) * 10)
  return [1, ...tens.filter((n) => n < cols - 3), cols]
}
```

Inside the returned `<div className=...grid-stage...>`, before `{children}`, add:

```tsx
      {/* The numbered scale printed on a typewriter above the paper. Part of
          the stage so it shrinks with the grid and every destroyer gets it. */}
      <div className="grid-ruler" aria-hidden="true">
        {rulerMarks(grid.cols).map((n) => (
          <span key={n} className="grid-ruler-mark" style={{ '--col': n - 1 } as React.CSSProperties}>
            <small>{n}</small>
          </span>
        ))}
      </div>
```

- [ ] **Step 8: Styles**

In `src/styles/destruction.css`:

Delete the `.destroy-instructions` and `.hud-progress` rules.

In `.grid-stage`, change the middle line of the `font-size: min(...)` to

```css
    calc((100dvh - 15rem) / (var(--rows) * 1.6 + 1.5)),
```

and update the comment above it to mention that the `+ 1.5` rows' worth of height is the column scale, and 15rem covers the ticker and the HUD.

After the `.phase-destroy` rule add:

```css
/* Ticker tape: a paper strip carrying the count and the instructions. Static
   on purpose -- a scrolling ticker would pull the eye off the destruction. */
.ticker {
  margin: 0;
  max-width: min(100%, 46rem);
  padding: 0.35rem 0.9rem;
  background: var(--paper-light);
  border-top: 1px solid var(--surface-edge);
  border-bottom: 1px solid var(--surface-edge);
  font-size: 0.68rem;
  line-height: 1.7;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.ticker > span + span::before {
  content: '▪';
  margin: 0 0.7em;
  color: var(--ink-faint);
}

.ticker em {
  font-style: normal;
  color: var(--ribbon);
}
```

After the `.cell` rule add:

```css
/* The typewriter's column scale, sitting just above the grid. Each mark is one
   cell wide at the grid's own size; only the number inside is smaller, so the
   `ch` maths stays exact. */
.grid-ruler {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 1.1em;
  margin-bottom: 0.4em;
  border-bottom: 1px solid var(--ribbon);
  pointer-events: none;
}

.grid-ruler-mark {
  position: absolute;
  left: calc(var(--col) * 1ch);
  bottom: 0;
  width: 1ch;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.grid-ruler-mark::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  height: 0.25em;
  border-left: 1px solid var(--ribbon);
}

.grid-ruler-mark small {
  font-size: 0.55em;
  line-height: 1;
  margin-bottom: 0.55em;
  color: var(--ribbon);
}
```

- [ ] **Step 9: Run the stress check and the build**

Run: `node .superpowers/checks/t5-destroy.mjs && npm run build`
Expected: every line `ok:` across 2 destroyers × 4 shapes × 3 runs plus 2 touch runs (104 lines); no FAIL; build succeeds. This takes several minutes. Open `shots/t5-snake-desktop.png` and `t5-fire-desktop.png`: ruler numbers line up over columns 1, 10 … 58 and the ticker reads as one strip.

- [ ] **Step 10: Commit**

```bash
git add src/features/destruction src/styles/destruction.css
git commit -m "Add a ticker-tape count and a column scale to the destruction screen"
```

---

### Task 6: Rubber stamp and receipt on the aftermath

**Files:**
- Create: `src/features/aftermath/Receipt.tsx`, `.superpowers/checks/t6-aftermath.mjs`
- Modify: `src/App.tsx`, `src/features/aftermath/AftermathPhase.tsx`, `src/styles/base.css` (aftermath section)

**Interfaces:**
- Consumes: `formatTime` (Task 2), `Destroyer.short` (Task 4), `findDestroyer` (existing, `registry.ts`), `.printed`, `.fine-print` (Task 1).
- Produces: `type ReceiptData = { number: string; words: number; characters: number; filedAt: Date; destroyedAt: Date; method: string }` and `<Receipt receipt={ReceiptData} />`.

- [ ] **Step 1: Write the failing check**

`.superpowers/checks/t6-aftermath.mjs`:

```js
import { open, seed, assert, sleep, shot } from './lib.mjs'

async function run({ reducedMotion, width = 1280, height = 900, name }) {
  const { browser, page } = await open({ width, height, reducedMotion })
  await seed(page, 'burn this one quickly')
  await page.click('.button-primary')
  await page.waitForSelector('.ticket-fire')
  await page.click('.ticket-fire')
  await page.waitForSelector('.phase-aftermath', { timeout: 60_000 })

  const stamp = await page.$eval('.stamp', (e) => e.innerText)
  assert(stamp === 'NOT DELIVERED', `${name}: stamp reads NOT DELIVERED (got "${stamp}")`)
  const rows = await page.$$eval('.receipt-row', (els) =>
    els.map((e) => [e.querySelector('dt').textContent, e.querySelector('dd').textContent]),
  )
  const data = Object.fromEntries(rows)
  assert(data.words === '4', `${name}: receipt words = 4 (got ${data.words})`)
  assert(data.characters === '18', `${name}: receipt characters = 18 (got ${data.characters})`)
  assert(data.method === 'fire', `${name}: receipt method = fire (got ${data.method})`)
  assert(/\d:\d{2}/.test(data.filed) && /\d:\d{2}/.test(data.destroyed), `${name}: filed and destroyed times shown`)
  const number = await page.$eval('.receipt-title', (e) => e.innerText)
  assert(/NO\. \d{4}$/.test(number), `${name}: receipt has a four-digit number (got "${number}")`)

  if (reducedMotion) {
    await sleep(150)
    const opacity = await page.$eval('.stamp', (e) => Number(getComputedStyle(e).opacity))
    assert(opacity > 0.5, `${name}: stamp visible at once under reduced motion (opacity ${opacity})`)
  } else {
    await sleep(2000)
    await shot(page, `t6-aftermath-${name}`)
  }
  await browser.close()
}

await run({ reducedMotion: false, name: 'desktop' })
await run({ reducedMotion: false, width: 390, height: 844, name: 'phone' })
await run({ reducedMotion: true, name: 'reduced-motion' })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node .superpowers/checks/t6-aftermath.mjs`
Expected: `Error: failed to find element matching selector ".stamp"`.

- [ ] **Step 3: The receipt**

`src/features/aftermath/Receipt.tsx`:

```tsx
import { formatTime } from '../../lib/time'

export type ReceiptData = {
  /** Four digits, made up per message, like a clerk's docket number. */
  number: string
  words: number
  characters: number
  /** When they chose a destroyer -- the moment the draft was deleted. */
  filedAt: Date
  /** When the last character went. */
  destroyedAt: Date
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
    ['destroyed', formatTime(receipt.destroyedAt)],
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
```

- [ ] **Step 4: Stamp and receipt on the aftermath screen**

In `src/features/aftermath/AftermathPhase.tsx`:

Add `import { Receipt, type ReceiptData } from './Receipt'` below the React import.

Change `Props` to:

```tsx
type Props = {
  receipt: ReceiptData
  onWriteAgain: () => void
}
```

and the signature to `export function AftermathPhase({ receipt, onWriteAgain }: Props) {`.

Replace the `<div className="aftermath-content">…</div>` block with:

```tsx
      <div className="aftermath-content">
        <p className="printed stamp">Not delivered</p>
        <Receipt receipt={receipt} />
        <button className="button button-primary" onClick={onWriteAgain}>
          Write something else
        </button>
      </div>
```

- [ ] **Step 5: App carries the receipt**

In `src/App.tsx`:

Add imports:

```tsx
import type { ReceiptData } from './features/aftermath/Receipt'
import { findDestroyer } from './features/destruction/registry'
```

Change the `Stage` type's last two members to:

```tsx
  | { name: 'destroy'; destroyerId: string; filedAt: Date }
  | { name: 'aftermath'; receipt: ReceiptData }
```

Above `export default function App()` add:

```tsx
/** A docket number for the receipt. Made up; nothing is stored. */
const docketNumber = () => String(Math.floor(Math.random() * 10_000)).padStart(4, '0')
```

In `beginDestruction`, change `setStage({ name: 'destroy', destroyerId })` to:

```tsx
      setStage({ name: 'destroy', destroyerId, filedAt: new Date() })
```

Replace `finishDestruction` with:

```tsx
  const finishDestruction = useCallback(() => {
    setStage((current) =>
      current.name !== 'destroy'
        ? current
        : {
            name: 'aftermath',
            receipt: {
              number: docketNumber(),
              words: countWords(condemned),
              characters: condemned.replace(/\s/g, '').length,
              filedAt: current.filedAt,
              destroyedAt: new Date(),
              method: findDestroyer(current.destroyerId)?.short ?? current.destroyerId,
            },
          },
    )
    setCondemned('')
  }, [condemned])
```

Replace the `AftermathPhase` usage with:

```tsx
        <AftermathPhase receipt={stage.receipt} onWriteAgain={() => setStage({ name: 'write' })} />
```

- [ ] **Step 6: Styles**

In `src/styles/base.css`, in the aftermath section: change `.aftermath-content`'s `gap: 2rem;` to `gap: 1.75rem;`, delete the `.aftermath-stat` and `.aftermath-stat-sub` rules, and add after `.aftermath-content`:

```css
/* A rubber stamp, thumped down a moment after the screen arrives. Tilted, and
   a little translucent, the way real stamp ink sits on paper. */
.stamp {
  margin: 0;
  padding: 0.4rem 1.1rem 0.3rem;
  border: 3px solid var(--stamp);
  border-radius: 6px;
  color: var(--stamp);
  font-size: 2.2rem;
  opacity: 0.85;
  transform: rotate(-8deg);
  animation: stamp-down 0.38s var(--ease) 0.5s both;
}

@keyframes stamp-down {
  from {
    opacity: 0;
    transform: rotate(-8deg) scale(1.6);
  }
}

/* Torn off a pad: the zig-zag bottom edge is cut with a mask, so the page
   shows through the teeth. */
.receipt {
  --tooth: 0.5rem;
  width: min(18rem, 100%);
  padding: 0.9rem 1.1rem 1.4rem;
  background: var(--surface);
  border: 1px solid var(--surface-edge);
  border-bottom: 0;
  font-size: 0.8rem;
  text-align: left;
  mask:
    linear-gradient(black 0 0) top / 100% calc(100% - var(--tooth)) no-repeat,
    conic-gradient(from -45deg at 50% 100%, black 90deg, transparent 0) bottom / calc(2 * var(--tooth)) var(--tooth) repeat-x;
  animation: phase-in 0.6s var(--ease) 1s both;
}

.receipt-title {
  margin: 0 0 0.5rem;
  text-align: center;
}

.receipt dl {
  margin: 0;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  padding: 0.15rem 0;
  border-bottom: 1px dotted var(--surface-edge);
  font-variant-numeric: tabular-nums;
}

.receipt-row:last-child {
  border-bottom: 0;
}

.receipt-row dd {
  margin: 0;
}
```

These rules must come after `.printed` in the file so `.stamp`'s colour wins; they do, since the aftermath section follows the controls section.

In the `@media (prefers-reduced-motion: reduce)` block at the bottom of `base.css`, add two lines inside the `*, *::before, *::after` rule:

```css
    animation-delay: 0ms !important;
    transition-delay: 0ms !important;
```

Without them the stamp's 0.5s delay still holds it invisible under reduced motion, because the existing rule shortens durations but not delays.

- [ ] **Step 7: Run the check, look, and build**

Run: `node .superpowers/checks/t6-aftermath.mjs && npm run build`
Expected: all `ok:` lines for desktop, phone and reduced-motion; build succeeds. Open `shots/t6-aftermath-desktop.png` and `-phone.png`: the stamp is tilted and blue, the receipt's bottom edge is zig-zag teeth (not a flat edge or inverted notches).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/features/aftermath src/styles/base.css
git commit -m "End on a NOT DELIVERED stamp and a torn receipt"
```

---

### Task 7: Docs and final sweep

**Files:**
- Create: `.superpowers/checks/t7-sweep.mjs`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything above.
- Produces: up-to-date project docs.

- [ ] **Step 1: Screenshot sweep script**

`.superpowers/checks/t7-sweep.mjs`:

```js
import { open, seed, sleep, shot, assert } from './lib.mjs'

for (const [width, height, name] of [[1280, 900, 'desktop'], [390, 844, 'phone']]) {
  const { browser, page } = await open({ width, height, touch: name === 'phone' })
  await seed(page, 'Dear past self,\nI kept the letter you wrote and never sent it.')
  await sleep(300)
  await shot(page, `final-1-write-${name}`)
  await page.click('.button-primary')
  await page.waitForSelector('.ticket')
  await shot(page, `final-2-choose-${name}`)
  await page.click('.ticket-fire')
  await page.waitForSelector('.ticker')
  await sleep(1200)
  await shot(page, `final-3-destroy-${name}`)
  await page.waitForSelector('.phase-aftermath', { timeout: 60_000 })
  await sleep(2000)
  await shot(page, `final-4-aftermath-${name}`)
  assert(true, `${name}: all four screens captured`)
  await browser.close()
}
```

- [ ] **Step 2: Run the sweep and every earlier check**

```bash
for f in t1-font t2-strip t3-labels t4-tickets t6-aftermath t7-sweep t5-destroy; do
  node .superpowers/checks/$f.mjs || echo "FAILED: $f"
done
grep -rnE '#[0-9a-fA-F]{3,8}\b' src --include=*.tsx --include=*.ts
npm run build
```

Expected: no `FAIL:` or `FAILED:` lines. The grep prints nothing (no hex colours in components). Build succeeds. Look at all eight `final-*` screenshots.

- [ ] **Step 3: Update CLAUDE.md**

Make these edits in `CLAUDE.md`:

In **§1 Product**, change step 4 to:
`4. **Aftermath.** A NOT DELIVERED stamp, a torn receipt (counts and times, never the words), drifting ash, and an invitation to write again.`

In **§2 Layout**, change the `lib/` line to
`  lib/                          useLocalDraft, useIsTouch, useClock, time, sound`
and add under `aftermath/`:
`      Receipt.tsx               the torn receipt and its data`

In **§2 Extension point**, step 1, append: `Give it a one-word \`short\` and a line-drawing \`Mark\` for its ticket; call \`onProgress\` if you want the ticker to count.`

In **§3 Design**, after the first paragraph, add:

```markdown
**The telegram kit.** Each screen borrows telegram-office parts, never the whole
form: a header strip over the page (Write), counter tickets (Choose), ticker tape
and the typewriter's column scale (Destroy), a rubber stamp and a torn receipt
(Aftermath), and patent-drawing notes on the machine. Printed parts are capitals
in `--display`; the user's own words never are.
```

In the tokens table: delete nothing but add rows after `--snake`:

```markdown
| `--stamp` | `#2f4a6b` | Rubber stamps and patent notes. The one cool colour. **~7:1** |
| `--display` | Barlow Condensed | Printed capitals on the form. Bundled in `src/assets/fonts`. |
| `--annotation` | Georgia | The italic notes on the machine. |
```

Delete the quoted paragraph `> \`--machine\` and \`--machine-rail\` are **dead** …` and the Known issues bullet `**\`--machine\` / \`--machine-rail\` are unused.**`.

In **Guidelines**, rule 3, append: `The one exception is stamp blue, which is ink, not heat.`

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Document the telegram kit"
```

Do **not** push. Pushing to `main` publishes the live site; ask the user first.
