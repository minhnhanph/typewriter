# Typewriter

Write something down. Then destroy it.

## Running it

```bash
npm install   # once
npm run dev   # start it -- opens at http://localhost:5173
npm run build # make the version you'd put on the internet (into dist/)
```

`npm run build` typechecks first, so if it succeeds the code is sound. The
result is a folder of static files that can go on Vercel, Netlify or GitHub
Pages — there's no server to run.

## Where things are

```
src/
  App.tsx                    the four stages, and nothing else
  core/text.ts               the character grid everything is built on
  lib/                       draft saving, sound, touch detection
  features/writing/          the page and the typewriter
  features/destruction/      the choose screen and the effects
    destroyers/              one file per way of destroying the text
  features/aftermath/        the ashes
  styles/base.css            every colour and size in the app
```

## Making changes

- **Change how it looks** — the token block at the top of `src/styles/base.css`.
  Nothing else hardcodes a colour.
- **Add a way to destroy the text** — copy `destroyers/fire.tsx`, then add it to
  `destroyers/registry.ts`. That's the whole change.
- **Change how it feels** — the constants at the top of `snake.tsx` and
  `fire.tsx` control speed, growth and how fast fire spreads.

## Everything else

**[CLAUDE.md](CLAUDE.md)** is the full picture: what the product is, the
decisions already made and why, the design system, the bugs that have already
bitten, and what's still open. Start there.
