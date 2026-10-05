# cytoid-notes-design

A full set of flat-style note designs and animations for [Cytoid](https://github.com/Cytoid/Cytoid). One design source produces two deliverables:

- **Vector**: a scene tree computed per frame from a handful of geometric primitives. This is what Cytoid uses today, and it ports directly to Unity.
- **Frame animations**: PNG sequences, sprite sheets and a manifest baked from the same vector design, plus a set of Cylheim-compatible outputs.

The design spec lives in [docs/DESIGN.md](./docs/DESIGN.md); research notes live in [docs/research/references.md](./docs/research/references.md).

## Quick start

```sh
pnpm install
pnpm bake        # bake frame animations → playground/public/frames (~10 s)
pnpm dev         # start the review playground (Vue)
```

## Layout

```
src/
  tokens.ts          sizes / strokes / durations / default hues / grade colours
  palette.ts         OKLCH hue-driven palette (hue, hex, hueShift, saturation)
  core/              scene primitives, easings, colour math
  notes/             per-note designs (enter / hold layers / clear / miss), bodies, drag line
  render/            Canvas2D and SVG renderers
  bake/              frame baking (Node only, resvg) and Cylheim mapping
scripts/
  bake.ts            bake CLI
  sheet.ts           dev helper: contact sheets for every clip of a note, into .sheets/
playground/          Vue review app (gallery / inspector / chart preview / frame player / palette)
```

## Bake options

```sh
pnpm bake --out out/frames --fps 60 --scale 2 --cylheim
pnpm bake --kinds click,flick --dirs up --hue-shift 40
pnpm bake --palette my-palette.json     # export from the playground's Palette page
```

## Library usage

```ts
import { createContext, createPalette, drawScene, renderNote } from 'cytoid-notes-design'

const palette = createPalette({ families: { click: { up: 200 } } })
const ctx = createContext('click', { palette, direction: 'up', scale: 1 })
const scene = renderNote('click', { phase: 'enter', p: 0.6 }, ctx)
drawScene(canvas.getContext('2d')!, scene) // translate the origin to the note centre first
```

## Development

```sh
pnpm test        # geometry validity, effect fade-out, loop seamlessness, sampling inverses
pnpm typecheck
pnpm lint
```

## License

Code is MIT. The Cytus II assets mentioned in `docs/research` belong to their original authors; this repository uses them as reference only and includes or distributes none of them.
