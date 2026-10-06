**IMPORTANT**: KEEP THIS FILE UP TO DATE.

# cytoid-notes-design

Flat-style redesign of every Cytoid note (vector spec + baked frame animations) with a Vue review playground.

## Layout
- `src/tokens.ts` — sizes, strokes, durations, default hues, grade colours. Change numbers here first.
- `src/palette.ts` — OKLCH hue-driven palette (`createPalette`, `derivePalette`, `fitLightness`) with a Tailwind-style 50–950 shade scale per family (400 = true colour) and `tone(palette, step)` for fractional steps — all in-note shade motion goes through it.
- `src/core/` — `scene.ts` (6 primitives + group, bounds), `ease.ts` (seg/lerp/easings/rng), `color.ts` (oklch).
- `src/notes/` — one file per family (`click`, `hold`, `drag`, `flick`, `drop`), shared `parts.ts`, `effects.ts` (clear/miss), `bodies.ts` (hold body, long hold body, drag line), `judgement.ts` (judgement text: custom chamfered stroke font, centred in the effect), `index.ts` (registry `designs`, `createContext`, `renderNote`, `clipsOf`).
- `src/render/` — `canvas.ts` (Canvas2D), `svg.ts` (SVG string).
- `src/bake/` — Node-only baker (resvg): `index.ts`, `sample.ts` (frame sampling rules, also exported from main entry), `cylheim.ts` (Cylheim file-name/timeline mapping). Exposed as `cytoid-notes-design/bake`.
- `scripts/bake.ts` — CLI (`pnpm bake`), `scripts/sheet.ts` — contact sheets to `.sheets/` (`pnpm exec tsx scripts/sheet.ts click,hold [up|down]`).
- `playground/` — Vue 3 + Vite review app; aliases `cytoid-notes-design` to `../src` (never import `src/bake/index.ts` in the browser).
- `playground/player/` — chart player core (TS, framework-agnostic; will become a standalone package later): `types.ts` (Cytoid chart format), `chart.ts` (parse: tempo/tick↔time, page positions, fade-in, chains), `state.ts` (pure per-frame derivation: note phases, drag segments, chain-follow, scanline), `clock.ts` (ManualClock/AudioClock), `pixi-render.ts` (SceneView: scene graph → Pixi sync adapter), `stage.ts` (Pixi layers + pooled note views + core-styled HUD, all drawn from the design clips), `judgement.ts` (play-mode input judging: tap/hold/drag/cdrag/flick-swipe, windows in `JUDGE_WINDOWS`, `autoplayStats`), `layout.ts` (two-stage geometry: 4:3–22:9 aspect clamp + core `#note-box` insets), `player.ts` (controller: clock + judge + stage), `level.ts` (.cytoidlevel zip / URL loading).
- `playground/test/` — vitest project for the player core (see root `vitest.config.ts`, two projects: `package` + `playground`).
- `playground/public/level/` — bundled demo level (夢色パレード — Yunomi, **CC BY-NC-SA 3.0**; attribution shown in the Player view).
- `docs/DESIGN.md` — design spec (Chinese). `docs/research/references.md` — Cytoid/Cylheim findings.

## Conventions
- Clips are pure functions `draw(x, ctx) => SceneNode`; no state, deterministic (use `rng(seed)` for randomness).
- Angles: 0 = 12 o'clock, clockwise. +y down. Origin = note centre. Unit = 128 design px.
- Enter clips are `normalized` and must end at the exact hit pose at p = 1. Only Click/Flick carry timing feedback (Cytus II-measured: dim pre-roll, shade split 0.25–0.85 (spawn 700; core → 400, base → 800), ease-in core 0.42–0.94, linear approach ring/chevrons at α 0.5 from 0.7, double blink); the enter **size** of Click/Flick/drag family follows per-kind fitted Cytus II S-curves (`tokens.sizeCurve` + `riseSettleCurve` — one slow-fast-slow rise, one settle, exact 1.0 at p = 1; source staircase/texture pops deliberately not reproduced); Hold and the Drag series reach their shape early (hold p≈0.35, drag ring/arrow p=0.2) and only wake their colours 600 → 400 over `WAKE` (0.45–0.7) — the page cue that separates next-page notes. Drop notes are `static` (one still image).
- Keep Cytoid's original drag line (white dashed, 0.0716u) and hold body width (0.284u). Keep clear effects compact (≤ ~1.5× note radius) and peripheral hints faint.
- Click-drag family defaults to the click hues.
- Effects must fully fade by `duration` (tested). Loops must be seamless (tested).
- Flat only: solid fills/strokes, opacity; no gradients/glow.

## Commands
- `pnpm test`, `pnpm typecheck`, `pnpm lint --fix`, `pnpm bake [--cylheim]`, `pnpm dev`, `pnpm build:playground`.
- Playground typecheck: `pnpm -C playground exec vue-tsc --noEmit` (player/ is only pulled into the program when the Player view imports it).
- Player conventions: everything on screen is derived per frame from chart time (no schedulers — seek is just re-derivation); judgement works on pure state machines in `judgement.ts`; HUD is system-UI Pixi `Text` styled after the core's `#combo`/`#score`; the judgement font in `src/notes/judgement.ts` also carries digits/`X`/`%`/`.` for UI text.
- Pixi v8 gotchas learned here: `renderer.width` is already logical px (never divide by resolution), `Graphics extends Container` (don't use instanceof to distinguish), `resizeTo` can miss late layout changes (keep the manual `ResizeObserver`).
- References: [Cytoid](https://github.com/Cytoid/Cytoid) (public source repo) and the Cylheim project (private research checkout; Cytus II assets: reference only, never copy).
