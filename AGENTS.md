**IMPORTANT**: KEEP THIS FILE UP TO DATE.

# cytoid-notes-design

Flat-style redesign of every Cytoid note (vector spec + baked frame animations) with a Vue review playground.

## Layout
- `src/tokens.ts` — sizes, strokes, durations, default hues, grade colours. Change numbers here first.
- `src/palette.ts` — OKLCH hue-driven palette (`createPalette`, `derivePalette`, `fitLightness`).
- `src/core/` — `scene.ts` (6 primitives + group, bounds), `ease.ts` (seg/lerp/easings/rng), `color.ts` (oklch).
- `src/notes/` — one file per family (`click`, `hold`, `drag`, `flick`, `drop`), shared `parts.ts`, `effects.ts` (clear/miss), `bodies.ts` (hold body, long hold body, drag line), `judgement.ts` (judgement text: custom chamfered stroke font, centred in the effect), `index.ts` (registry `designs`, `createContext`, `renderNote`, `clipsOf`).
- `src/render/` — `canvas.ts` (Canvas2D), `svg.ts` (SVG string).
- `src/bake/` — Node-only baker (resvg): `index.ts`, `sample.ts` (frame sampling rules, also exported from main entry), `cylheim.ts` (Cylheim file-name/timeline mapping). Exposed as `cytoid-notes-design/bake`.
- `scripts/bake.ts` — CLI (`pnpm bake`), `scripts/sheet.ts` — contact sheets to `.sheets/` (`pnpm exec tsx scripts/sheet.ts click,hold [up|down]`).
- `playground/` — Vue 3 + Vite review app; aliases `cytoid-notes-design` to `../src` (never import `src/bake/index.ts` in the browser).
- `docs/DESIGN.md` — design spec (Chinese). `docs/research/references.md` — Cytoid/Cylheim findings.

## Conventions
- Clips are pure functions `draw(x, ctx) => SceneNode`; no state, deterministic (use `rng(seed)` for randomness).
- Angles: 0 = 12 o'clock, clockwise. +y down. Origin = note centre. Unit = 128 design px.
- Enter clips are `normalized` and must end at the exact hit pose at p = 1. Only Click/Flick carry timing feedback (Cytus II-style: ease-in core, linear approach ring/arrows, blink at 0.92–1); Hold and the Drag series reach a steady pose early (hold p≈0.35, drag p=0.2); Drop notes are `static` (one still image).
- Keep Cytoid's original drag line (white dashed, 0.0716u) and hold body width (0.284u). Keep clear effects compact (≤ ~1.5× note radius) and peripheral hints faint.
- Click-drag family defaults to the click hues.
- Effects must fully fade by `duration` (tested). Loops must be seamless (tested).
- Flat only: solid fills/strokes, opacity; no gradients/glow.

## Commands
- `pnpm test`, `pnpm typecheck`, `pnpm lint --fix`, `pnpm bake [--cylheim]`, `pnpm dev`, `pnpm build:playground`.
- References: [Cytoid](https://github.com/Cytoid/Cytoid) (public source repo) and the Cylheim project (private research checkout; Cytus II assets: reference only, never copy).
