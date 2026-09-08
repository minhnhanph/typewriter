# Typewriter

Write something down. Then destroy it.

This file is the durable context for the project — what it is, how it's built,
and how it should look. `README.md` covers only how to run it.

---

## 1. Product

A single-page site with one short journey and no accounts:

```
write  →  choose  →  destroy  →  aftermath
```

1. **Write.** A drawn typewriter reacts to every keystroke while the text fills
   a page that scrolls as it grows.
2. **Choose.** Two ways to destroy it: feed it to a snake, or give it to a fire.
3. **Destroy.** The text is eaten or burned away, character by character.
4. **Aftermath.** Ash drifts, a word count, and an invitation to write again.

**The promise the product rests on: the destruction is real.** The draft is
deleted from the browser the moment the user picks a destroyer — not when the
animation finishes. If words could reappear on a refresh, the whole thing is
theatre. Anything that weakens this needs a deliberate decision, not a shortcut.

### Locked product decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Where drafts live | The user's own browser only. No server, no account. | Nothing to breach, nothing to maintain, no privacy policy. |
| When the draft dies | The moment they choose a destroyer. | The point of no return, and it protects the promise above. |
| Snake | Playable with arrow keys / WASD on desktop; runs itself on touch devices. | Steering wants a keyboard; phones still reach the same ending. |
| Can you lose? | **No.** Walls wrap, the snake passes through itself. | It's a ritual, not a challenge. Failing would turn your own words into an obstacle you're losing at. |
| Fire | Watch it, but click or tap anywhere to drop another spark. | Deliberate contrast with the snake: one is "I destroy it", the other is "I let it go". |
| Sound | Synthesised in the browser, no audio files. Mutable, top right. | No assets to host; the first keystroke satisfies the browser's autoplay rule. |

---

## 2. Technical

**Stack:** Vite + React + TypeScript, plain CSS. No backend, no database, no
state library, no UI kit. React is the only runtime dependency.

```bash
npm install       # once
npm run dev       # http://localhost:5173
npm run build     # typechecks, then builds to dist/
```

Deploys as static files anywhere (Vercel, Netlify, GitHub Pages).

### The one idea everything rests on

`src/core/text.ts` turns text into a **grid of character cells** — graph paper,
where every letter has a row and column number. Because the font is monospace
this is exact and costs nothing.

- **Writing** uses it to draw lines and place the caret.
- **Destroying** uses it to know what the snake can eat and the fire can burn.

That's why the snake and the fire share almost no code but line up perfectly.
`COLS = 58` is the page width in characters; changing it reflows everything.

### Layout

```
src/
  App.tsx                       the 4-stage machine, and nothing else
  core/text.ts                  wrapping, the character grid, word count
  lib/                          useLocalDraft, useIsTouch, sound
  features/
    writing/                    Paper (the page), Typewriter (the machine)
    destruction/
      ChoosePhase, DestructionPhase, GridStage
      registry.ts               ← the list of destroyers
      types.ts                  ← the Destroyer contract
      destroyers/snake.tsx, fire.tsx
    aftermath/
  styles/                       base.css holds every colour and size
```

### Extension point

Adding a third way to destroy the text:

1. Copy `destroyers/fire.tsx`. Empty the grid however you like; call
   `onComplete()` when done.
2. Add it to the array in `registry.ts`.

That's the whole change. Nothing else needs to know it exists.

### Gotchas that have already caused real bugs

Each of these was a genuine failure, not a hypothetical:

- **Focus.** The writing screen's input is an invisible `<textarea>` that we
  focus in code. A plain click moves focus to the page body and typing silently
  stops. Any clickable thing on that screen must cancel the default mousedown
  (see `WritingPhase.keepFocus` and the sound toggle in `App.tsx`).
- **Fire burns the page, not the letters.** Letters igniting neighbouring
  letters cannot cross the gap between two words — every space is a firebreak
  and it stalls. The flame front lives on the full rectangle, blanks included.
- **Every ignition must go through `lightAt()`.** Seeding the fire directly
  once left a letter that could never catch while its spot was marked burnt,
  hanging the phase forever. It was intermittent and took a 20-run stress test
  to trust the fix.
- **Ash timing is coupled.** `.cell-ash`'s animation duration must match
  `ASH_TICKS × TICK` in `fire.tsx`, or letters get cut off mid-fade.
- **The destruction stage auto-shrinks** to fit the viewport via a `min()` on
  its font size — you can't play a snake game that's half off the page.

### Verifying changes

There is no test suite. Changes have been verified by driving real Chrome with
`puppeteer-core` (Chrome is installed; `puppeteer-core` needs no download).
Both destroyers are randomised, so **a single passing run proves nothing** —
run each to completion across several text shapes (one word, a full page,
single spaced letters, one unbroken long word) and check none hang.

---

## 3. Design

**Aged paper and a typing manual.** A warm cream page with generated grain, ink
the faded brown of a typewriter ribbon, and a red accent taken from the red half
of a two-colour ribbon. The machine is drawn as flat line art — the style of a
mid-century typing chart.

### Semantic tokens

All of them live at the top of `src/styles/base.css`. Nothing else in the app
hardcodes a colour, so retheming means editing that one block.

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#ece2cd` | The page. Everything sits on this. |
| `--paper-light` | `#f4ecda` | Lifted paper: keycap faces, the space bar, text on dark. |
| `--surface` | `#f6efdf` | Raised cards (the two choices). |
| `--surface-edge` | `#d5c7a9` | Borders on raised things and quiet buttons. |
| `--ink` | `#33291f` | Body text, and every drawn line on the machine. **11.0:1** |
| `--ink-dim` | `#6d6152` | Secondary text: placeholder, sub-labels. **4.7:1** |
| `--ink-faint` | `#736450` | Quiet metadata: word count, HUD. **4.5:1** |
| `--ribbon` | `#a33a26` | The accent. Primary buttons, caret, pressed keys. **5.1:1** |
| `--ribbon-bright` | `#c04a30` | Accent hover only. |
| `--ember` | `#d2500f` | Fire, on the choose screen. |
| `--char` | `#4a3f33` | Charred letters and drifting ash. |
| `--snake` | `#5f7a37` | The snake. **3.8:1** — decorative, never text. |
| `--mono` / `--type-size` / `--lh` | — | The character grid. `--lh` must stay a length, not a ratio; everything is positioned against it. |
| `--ease` | — | The one easing curve. Use it for all motion. |

Contrast is measured against `--paper`. `--ink-faint` at 4.45 sits just under
the 4.5 accessibility threshold, so it is only for text nobody has to read.

> `--machine` and `--machine-rail` are **dead** — leftovers from when the
> keyboard had dark caps. Safe to delete.

### Guidelines

Short, and each one earns its place:

1. **Flat, not shaded.** The machine is line art: heavy outlines, no gradients,
   no drop shadows. Depth is what made it look rendered instead of drawn.
2. **Circles, staggered, on an arc.** Round caps in rows that each indent a
   little further, with the end keys riding higher. A straight row of circles
   reads as a calculator.
3. **Fire scorches, it doesn't glow.** A glow is invisible on pale paper. Flame
   carries a burnt-sienna char mark with it. Anything "hot" on this theme must
   darken, not brighten.
4. **Colour comes from the table above.** If a new colour seems necessary, it
   probably means a token is missing, not that a hex belongs in a component.
5. **Motion is quiet.** One easing curve, short durations. The app respects
   `prefers-reduced-motion` — keep it that way.
6. **The page is the interface.** Blank space is the product, not a gap to fill.

### Where the feel lives

The numbers worth turning when something feels wrong:

| Feel | Where |
| --- | --- |
| Snake speed, growth, length cap | `destroyers/snake.tsx` top constants |
| Fire spread, heat, how long char lingers | `destroyers/fire.tsx` top constants |
| Page width in characters | `COLS` in `core/text.ts` |
| Keyboard arc and stagger | `arc()` and row `indent` in `Typewriter.tsx` |

---

## Known issues

- **Mobile writing screen: text runs off the right edge.** The page is a fixed
  58-character grid and 58 characters don't fit in 390px at this size. The real
  fix is making the column count adapt, which touches text layout, not styling.
  Deliberately deferred — the project is desktop-first.
- **A large empty gap** between the text and the machine on the writing screen.
  Unresolved on purpose; needs a design call (centre the text, cap the page
  height, or leave it as breathing room).
- **Ash on the aftermath screen is very subtle** since the theme went light.
- **`--machine` / `--machine-rail` are unused.**

## Open threads

- **Hand-drawn keys.** Options were laid out (CSS wobble, double stroke, an SVG
  wobble filter, rough.js, or real drawn artwork). No decision yet, and it's
  unresolved whether it means the keycaps only or the UI buttons too.

## Working agreement

The person building this **does not write code**. Explain technical decisions in
one plain line ("Vite is the tool that runs the site on your laptop"), make
routine engineering calls without asking, and surface only decisions that change
the product. When they pick the more expensive option, name the cost once and
then build it.
