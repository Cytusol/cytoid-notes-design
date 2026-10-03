# Cytoid note laboratory

Run `pnpm dev` at the repository root, or `pnpm -C playground dev`. The five hash-addressable views (`#gallery`, `#inspector`, `#chart`, `#frames`, `#palette`) share a persistent palette. Gallery review settings also control the inspector's initial direction and background.

- Gallery: all ten note kinds, full lifecycles with hold bodies, static ready poses, clip captions, playback and surface controls.
- Inspector: individual clips, frame stepping at 30/60 FPS, progress scrubbing, zoom, bounds, onion skins, direction comparison, clickable vector filmstrip.
- Chart: deterministic 120 BPM / two-beat pages, alternating directions, every note kind, full-height long holds, growing/retracting chains, falling drops, configurable autoplay judgements.
- Frames: manifest-driven sprite playback, continuous or sampled vector comparison, every frame, body texture links, Cylheim compatibility file patterns.
- Palette: OKLCH hue and saturation controls, raw six-digit hex overrides, presets, JSON import/export. Palette JSON uses the root `PaletteOptions` schema.

Generate local assets with `pnpm bake`. Bake palette edits with `pnpm bake --palette cytoid-palette.json`. Asset URLs respect Vite's `base`. Frames keep their original baked palette; live vectors use the current global palette. Cylheim exports are optional and retain their own timelines and numbering.

Validate with `pnpm -C playground build`, `pnpm -C playground lint`, `pnpm lint`, and `pnpm typecheck` from the root. Browser canvases share a single requestAnimationFrame clock, pause elapsed time in background tabs, and resize for HiDPI screens. No router, UI framework, external fonts, or runtime Node bake imports are required.
