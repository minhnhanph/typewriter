# Typewriter

For the words you've been carrying. Burn them, or send them to someone you love.

This file is the durable context for the project — what it is, how it's built,
and how it should look. `README.md` covers only how to run it.

---

## 1. Product

A single-page site with one short journey and no accounts:

```
write  →  choose  →  destroy  →  aftermath
                 ↘  send     ↗
```

1. **Write.** A drawn typewriter with a fixed printing point: the paper slides
   left as you type and up as you return, the way a real carriage moves.
2. **Choose.** Two ways to destroy it, feed it to a snake or give it to a fire,
   or a third: send it to a friend.
3. **Destroy.** The text is eaten or burned away, character by character.
   **Send** instead slides the sheet into an envelope.
4. **Aftermath.** A NOT DELIVERED stamp, a torn receipt (counts and times, never
   the words), drifting ash, and an invitation to write again. A sent letter
   gets a READY FOR DELIVERY stamp and its link to copy or share instead of ash.

**The friend's journey.** Opening a letter link shows the whole letter on a
still sheet — the machine's own paper and ink, out of the machine. A
**Letter · Typewriter** switch replays it typing itself out on the machine
(any key or click skips ahead). Then they choose its fate —
snake, fire, or **write back** (a fresh sheet headed REPLY, which they can send
back the same way). Destroying it ends on DESTROYED ON RECEIPT.

**The promise the product rests on: the destruction is real.** The draft is
deleted from the browser the moment the user picks a destroyer — not when the
animation finishes. If words could reappear on a refresh, the whole thing is
theatre. Anything that weakens this needs a deliberate decision, not a shortcut.

### Locked product decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Where drafts live | The user's own browser only. No server, no account. | Nothing to breach, nothing to maintain, no privacy policy. |
| When the draft dies | The moment they choose a destroyer, **or Send**. | The point of no return, and it protects the promise above. |
| Sending | The letter travels **inside its link**, after the `#`, which browsers never send to the server. Still no server. Sending deletes it here; the link is the only copy. The friend's browser never saves it, and the link leaves their address bar once they choose. | Keeps "no server" true. The honest cost: a link can't be revoked — whoever holds it can reopen it. |
| The friend's choices | Snake, fire, or write back. Not "send it on". | Received letters end with the friend, or start a reply. |
| Snake | Playable with arrow keys / WASD on desktop; runs itself on touch devices. | Steering wants a keyboard; phones still reach the same ending. |
| Can you lose? | **No.** Walls wrap, the snake passes through itself. | It's a ritual, not a challenge. Failing would turn your own words into an obstacle you're losing at. |
| Fire | Watch it, but click or tap anywhere to drop another spark. | Deliberate contrast with the snake: one is "I destroy it", the other is "I let it go". |
| Sound | Synthesised in the browser, no audio files. **On from the start**; a music note top right, crossed out when off. | No assets to host. Browsers won't play audio before the first click or keystroke, so the first letter typed is the first sound; nothing tries to play earlier. |
| Printing point | Fixed. The paper and carriage move, the caret never does. To read back, the paper rolls up like turning the platen knob (wheel, drag, ↑ ↓, Page Up/Down); the next keystroke rolls it home. | It's what separates a typewriter from a text editor in costume. Reading back is allowed; editing back up the page is not. |
| Right margin | A hard stop, always. The bell rings 7 columns before it; you end each line yourself. | Every line ends because you chose to end it. Pasted text is the exception: it wraps, or it would be lost. |
| Mechanical constraints | None. Back Spacer erases (and steps back up a line), Cmd+Z undoes, the paper never runs out. A strict mode with overprinting and a sheet that ends was built and then removed. | It's a writing tool, not a toy. The *feel* (sound, motion, carriage, bell) is all kept. |

---

## 2. Technical

**Stack:** Vite + React + TypeScript, plain CSS. No backend, no database, no
state library, no UI kit. React is the main runtime dependency; three.js is the
other, used only by the anatomy view and downloaded only when it opens.

```bash
npm install       # once
npm run dev       # http://localhost:5173
npm run build     # typechecks, then builds to dist/
```

Deploys as static files anywhere (Vercel, Netlify, GitHub Pages).

### The one idea everything rests on

Everything rests on a **grid of character cells** — graph paper,
where every letter has a row and column number. Because the font is monospace
this is exact and costs nothing.

- **Writing** (`src/core/sheet.ts`) keeps the draft *as* that grid: typed
  cells, a current column, a current line. The paper's position and the
  carriage's place on its rail are both derived from column and line, so they
  can't drift apart under fast typing. Each letter stores its own slight ink
  variation, fixed when typed.
- **Destroying** (`src/core/text.ts`) gets the draft back as plain text and
  lays it out on the same grid, to know what the snake can eat and the fire
  can burn. No line is ever wider than `COLS`, so it lines up exactly.

That's why the snake and the fire share almost no code but line up perfectly.
`COLS = 58` is the page width in characters; changing it reflows everything.

### Layout

```
src/
  App.tsx                       the stage machine (both journeys), and nothing else
  core/sheet.ts                 the machine as data: keystroke in, next draft out
  core/text.ts                  wrapping, the character grid, word count
  lib/                          useLocalDraft, useIsTouch, useClock, time, sound,
                                letterLink (text ⇄ link: compressed, after the #)
  features/
    writing/                    WritingPhase (input), useMachine (timing, sound),
                                Typewriter, Keyboard, Paper (the sliding sheet), TelegramStrip
    destruction/
      ChoosePhase, DestructionPhase, GridStage
      registry.ts               ← the list of destroyers
      types.ts                  ← the Destroyer contract
      destroyers/snake.tsx, fire.tsx
    aftermath/
      Receipt.tsx               the torn receipt and its data
    sending/
      SendPhase                 the envelope, while the link is packed
      LinkSlip                  copy / share the link, on the aftermath screen
      ReadingPhase              the friend's side, and its Letter · Typewriter switch
      LetterSheet               the whole letter on a still sheet (the default)
      TypedLetter               the letter typing itself out on the machine
      marks.tsx                 the SEND and REPLY ticket drawings
    anatomy/                    the machine as a rotatable patent drawing
      parts.ts                  ← the machine as data: shapes, numbers, notes
      scene.ts                  three.js: paper fills, ink outlines, opening, picking
      Figure.tsx, useOrbit.ts   the canvas, numbers, leader lines, drag and arrow keys
      AnatomySheet.tsx          the sheet, parts list and note (a modal <dialog>)
  styles/                       base.css holds every colour and size
```

### Extension point

Adding a third way to destroy the text:

1. Copy `destroyers/fire.tsx`. Empty the grid however you like; call
   `onComplete()` when done. Give it a one-word `short` and a line-drawing
   `Mark` for its ticket; call `onProgress` if you want the ticker to count.
2. Add it to the array in `registry.ts`.

That's the whole change. Nothing else needs to know it exists.

Send and Reply are **not** destroyers: they don't empty a grid. They're passed
to `ChoosePhase` as `extras` from `App.tsx`.

### Gotchas that have already caused real bugs

Each of these was a genuine failure, not a hypothetical:

- **Focus.** The writing screen's input is an invisible `<textarea>` that we
  focus in code. A plain click moves focus to the page body and typing silently
  stops. Any clickable thing on that screen must cancel the default mousedown
  (see `WritingPhase.keepFocus` and the sound toggle in
  `App.tsx`). The drawn keys aren't buttons for the same reason.
- **The input holds one space and nothing else.** Every keystroke is turned
  into a machine operation and cancelled. The space is there so phone
  keyboards still send Backspace — they don't on an empty field.
- **Keystrokes land through one queue, never a timer each.** A letter lands
  80 ms after its key goes down; a Back Spacer right behind it lands
  immediately after. With separate timers the browser sometimes fired them out
  of order and the letter overwrote the erase. See `useMachine.enqueue`.
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
  its font size — you can't play a snake game that's half off the page. The
  column scale above the grid is counted in that sum (the `+ 1.5`).
- **`useIsTouch` must answer on the first render.** The snake picks autopilot
  from its first render only. When touch was detected a moment later, phones
  got a manual snake with no keyboard and it never finished.
- **The anatomy sheet is a modal `<dialog>`, rendered outside the writing
  page.** Modal makes the page underneath inert, so arrow keys and letters
  can't roll the paper or type while it's open. Inside the page, its clicks
  would reach `keepFocus` and steal focus back to the textarea.
- **The anatomy canvas is created fresh on every mount.** Development's
  StrictMode mounts twice; a canvas whose WebGL context was given back can't
  be drawn on again, and it rendered blank.
- **`puppeteer-core` isn't in `package.json`,** so `npm install` removes it.
  Put it back with `npm install --no-save puppeteer-core`.

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

**The telegram kit.** Each screen borrows telegram-office parts, never the whole
form: a header strip over the page (Write), counter tickets (Choose), ticker tape
and the typewriter's column scale (Destroy), a rubber stamp and a torn receipt
(Aftermath), and the numbered patent drawing of the anatomy view. Printed parts are capitals
in `--display`; the user's own words never are.

### Semantic tokens

All of them live at the top of `src/styles/base.css`. Nothing else in the app
hardcodes a colour, so retheming means editing that one block.

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#ece2cd` | The page. Everything sits on this. |
| `--paper-light` | `#f4ecda` | Lifted paper: keycap faces, the space bar, text on dark. |
| `--surface` | `#f6efdf` | Raised paper: the tickets, the receipt. |
| `--surface-edge` | `#d5c7a9` | Borders on raised things and quiet buttons. |
| `--ink` | `#33291f` | Body text, and every drawn line on the machine. **11.0:1** |
| `--ink-dim` | `#6d6152` | Secondary text: placeholder, sub-labels. **4.7:1** |
| `--ink-faint` | `#736450` | Quiet metadata: word count, HUD. **4.5:1** |
| `--ribbon` | `#a33a26` | The accent. Primary buttons, caret, pressed keys. **5.1:1** |
| `--ribbon-bright` | `#c04a30` | Accent hover only. |
| `--ember` | `#d2500f` | Fire, on the choose screen. |
| `--char` | `#4a3f33` | Charred letters and drifting ash. |
| `--snake` | `#5f7a37` | The snake. **3.8:1** — decorative, never text. |
| `--stamp` | `#2f4a6b` | Rubber stamps and the anatomy's reference numbers. The one cool colour. **~7:1** |
| `--stamp-light` | `#4682c8` | Hovered parts on the anatomy drawing. Lines only. **3.1:1**, and 3.6:1 against the ink |
| `--display` | Barlow Condensed | Printed capitals on the form. Bundled in `src/assets/fonts`. |
| `--annotation` | Georgia | The patent-style notes and numbers on the anatomy sheet. |
| `--mono` / `--type-size` / `--lh` | — | The character grid. `--lh` must stay a length, not a ratio; everything is positioned against it. |
| `--ease` | — | The one easing curve. Use it for all motion. |

Contrast is measured against `--paper`. `--ink-faint` at 4.45 sits just under
the 4.5 accessibility threshold, so it is only for text nobody has to read.

### Guidelines

Short, and each one earns its place:

1. **Flat, not shaded.** The machine is line art: heavy outlines, no gradients,
   no drop shadows. Depth is what made it look rendered instead of drawn.
2. **Circles, staggered, on an arc.** Round caps in rows that each indent a
   little further, with the end keys riding higher. A straight row of circles
   reads as a calculator.
3. **Fire scorches, it doesn't glow.** A glow is invisible on pale paper. Flame
   carries a burnt-sienna char mark with it. Anything "hot" on this theme must
   darken, not brighten. The one exception is stamp blue, which is ink, not heat.
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
| Bell point, tab stops | top of `core/sheet.ts` |
| Typebar delay, swing cap, paper travel | top of `writing/useMachine.ts`; `.is-type` / `.is-tab` / `.is-return` in `writing.css` |
| Keyboard arc and stagger | `arc()` and row `indent` in `Typewriter.tsx` |
| Anatomy: opening speed, rest view, tilt limits, line weights | top of `anatomy/scene.ts` |
| Anatomy: a part's shape, number, note, or where it starts in the opening | its entry in `anatomy/parts.ts` |

---

## Known issues

- **Phone keyboards that build words** (most Android ones) only hand over a
  word when it's finished, so letters arrive a word at a time there.
- **Short laptop screens** show only about three typed lines above the
  printing point; the machine takes the rest of the height.
- **Ash on the aftermath screen is very subtle** since the theme went light.
- **A sent letter can't be taken back,** and chat apps may keep or preview the
  link. A full page makes a link of roughly 250 characters; much longer
  letters make longer links, which a few apps truncate.
- **The sender's link exists only on the READY FOR DELIVERY screen.** Close it without
  copying and the letter is gone — the screen says so.

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
