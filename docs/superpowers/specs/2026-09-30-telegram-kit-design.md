# Telegram kit — visual restyle

**Date:** 2026-09-30 · **Status:** awaiting review

## Intent

Make the site feel **human-made, elegant, typewriter-era, with a touch of tech.**
The chosen direction is the telegram office: the thing clerks actually typed on,
and the high technology of its day. It fits the product too — a message written,
never delivered.

This is a **kit, not a costume.** Each screen borrows only the telegram-era parts
that suit it. The existing look stays: aged paper, flat line art, ribbon-red
accent, monospace text. One new ink joins it: **stamp blue.**

Decided with the user:

- Telegram over punch card (punch cards belonged to keypunch machines, not typewriters).
- Carried through the whole journey, but each screen takes different parts.
- The user's text stays in normal case; only printed parts are in capitals.
- The typewriter gets patent-drawing labels.
- The form is built *around* the text. The character grid, the snake and the
  fire are not rewired.

Reference mockup: `.superpowers/brainstorm/…/content/journey-v2.html`.

## Screen by screen

### 1 · Write
- A slim **header strip** above the page, the width of the 58-column page:
  `TELEGRAM` in red condensed capitals, then two ruled boxes —
  **WORDS** (live count) and **FILED** (the current time, ticking each minute).
- The word count moves into the strip, so the separate "14 words" beside
  **Done** is removed. **Done** stays where it is.
- The rest of the page is unchanged blank paper.
- **Patent labels on the typewriter:** three small italic notes in stamp blue
  with thin pointer lines — *fig. 1 — platen*, *carriage*, *space bar*. Hidden
  on narrow screens where they would collide.

### 2 · Choose
- Small caption `CLASS OF SERVICE · 14 WORDS`, then the existing
  "How should it go?".
- Snake and Fire become **counter tickets**: raised card, round notches on both
  sides, a dashed perforation, `SERVICE A` / `SERVICE B`, a small line drawing
  (snake in `--snake`, flame in `--ember`), the name in red condensed capitals,
  and the tagline under the perforation.
- Tickets sit side by side, stacking on phones. They stay real buttons,
  keyboard-reachable. The drawing and label come from the registry, so a third
  destroyer gets a third ticket with no extra work.
- "Not yet — keep writing" unchanged.

### 3 · Destroy
- No form. Above the words:
  - a **ticker-tape strip** replacing the plain instruction line:
    `▪ TRANSMISSION CANCELLED ▪ 38 / 61 CHARACTERS DESTROYED ▪ CLICK TO DROP A SPARK ▪`
    — the count updates live; the last part is the destroyer's existing instruction.
  - the typewriter's **column scale** (1 · 10 · 20 … 58) in thin red, locked to
    the grid so it shrinks with it.
- The snake and fire themselves are unchanged.

### 4 · Aftermath
- A blue **NOT DELIVERED** rubber stamp, tilted, that thumps down on arrival
  (a quick press-in; appears instantly under reduced motion).
- Below it, a **torn receipt** with a zig-zag bottom edge:
  `RECEIPT · NO. 0142`, then words, characters, filed, destroyed, method.
- Ash keeps drifting. "Write something else" unchanged.
- "Filed" is the moment they chose a destroyer (when the draft was deleted);
  "destroyed" is when the animation finished. The message number is a random
  four-digit number per message.

## Design tokens

- **Add** `--stamp: #2f4a6b` — stamps, patent labels. About 7:1 on `--paper`.
- **Add** `--display` — the condensed capitals font, used only for printed labels
  (`TELEGRAM`, ticket names, the stamp). Barlow Condensed, bundled as a local font
  file (open licence, no outside requests), falling back to Arial Narrow.
- **Remove** the dead `--machine` / `--machine-rail`.
- Tickets, receipt and ticker reuse `--surface` / `--surface-edge` / `--paper-light`.
  No hex values outside `base.css`.
- Update the tokens table and guidelines in `CLAUDE.md` to match.

## How it's built

- **Unchanged:** `core/text.ts`, the character grid, draft deletion timing, the
  snake and fire game logic.
- **One small addition to the destroyer contract:** an optional
  `onProgress(destroyed, total)` so the ticker can count. Snake and fire call it
  when a character disappears. Optional, so a new destroyer works without it.
- **Registry entries** gain a `mark` (the ticket's line drawing).
- **`App.tsx`** keeps the timestamps, method and message number, and passes
  them to the aftermath.
- New pieces live with the screens that use them (the header strip in `writing/`,
  ticket and ticker in `destruction/`, stamp and receipt in `aftermath/`), with
  their styles in the existing CSS files.

## Things this must not break

- **Focus:** nothing new on the writing screen may take focus on click.
- **Destruction must still finish:** progress reporting only reads state, it never
  decides when the phase ends.
- **Auto-shrink:** the column scale and ticker must not push the snake field off
  screen.
- **Reduced motion:** the stamp and ticker respect it.

## Verification

Drive real Chrome with `puppeteer-core`, as before:

- Snake and fire each run to completion several times on four text shapes (one
  word, a full page, spaced single letters, one long unbroken word). None hang,
  and the ticker ends at `N / N`.
- Screenshots of all four screens at desktop width and at 390px.
- Typing still works after clicking anywhere on the writing screen.
- `npm run build` passes.

## Out of scope

Phone column width, the empty gap on the writing screen, hand-drawn keys, and
making the aftermath ash easier to see. These stay open.
