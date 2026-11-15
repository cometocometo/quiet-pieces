# Quiet Pieces

A calm jigsaw puzzle game for the web and phones.

**Play:** https://cometocometo.github.io/quiet-pieces/

- Real tab-and-blank pieces in three styles, 12 to 1,000 pieces, optional rotation
- 122 pictures: real Banff photographs plus 110 illustrations drawn in code
- A gentle daily puzzle with streaks, levels, achievements and best times
- Piece tray for phones, sorting by edges or colour, hints, eight table surfaces
- Synthesised sound and calm generative music
- Installable and fully playable offline; progress stays on your device

## Develop

```sh
npm install
npm run dev       # local dev server
npm test          # unit tests
npm run check     # type check
npm run build     # production build in dist/
```

Every push to `main` is tested and published to GitHub Pages by `.github/workflows/deploy.yml`.

## Layout

- `src/engine`: puzzle rules, piece shapes, layout, WebGL table (PixiJS), piece textures
- `src/art`: picture catalog, code-drawn generators, photo packs, background worker
- `src/data`: on-device storage, progression, daily puzzle, monetisation switch (off)
- `src/ui`, `src/app`: Svelte screens and app state
- `public/photos`: photographs (see credits below)
- `tests/unit`: Vitest; `tests/e2e`: Playwright walkthroughs

## Photo credits

Photographs come from Wikimedia Commons under Creative Commons licences that
allow commercial use with credit. Each photo's photographer, licence and
source page are listed in `src/art/photos.ts` and shown in the game under
Settings → Photo credits.
