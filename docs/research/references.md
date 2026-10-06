# Reference notes (research digest)

Condensed findings that the design is built on.

## Cytoid (current vector renderer) — [Cytoid/Cytoid](https://github.com/Cytoid/Cytoid)

- Renderers: `Assets/Scripts/Game/Notes/Classic/Classic*NoteRenderer.cs`, `Assets/Scripts/Game/Notes/Drop/*`.
- Composition: every classic note = `NoteRing` (white outline) + `NoteFill` (coloured disc).
  Hold adds body `Line`/`CompletedLine`, `ProgressRing`, `Triangle`, hold particles.
  Long hold adds a second body line that runs to both screen edges.
  Drag child has fill only (no ring). Flick = diamond ring/fill + left/right arrows.
  Click-drag head = drag head + chevron `CDragFill`. Drop click = capsule ring/fill + white core; drop drag = shorter capsule, no core.
- Approach: `t = clamp01((time - intro) / (start - intro))`; `size = target * lerp(initial_scale, 1, t)`; `fillScale = t`; `opacity = clamp(t * 2, 0, max)`.
  Fill scale reaching 1 is the main *timing cue* — preserved in the new design.
- Flick arrows start at ±0.3·orthoSize and converge linearly; they finish `min(0.25s, approach/2)` before the hit.
- Holding: ring/fill ease to 0.85 scale over 0.2 s; progress ring cut-off = progress; line alpha `0.5 + 0.5·progress`.
- Hold line width (`ClassicHoldNoteRenderer.ApplyTransformScale`): `HoldLine.png` is 100×21 px at 100 ppu,
  opaque span 56 px (white dashes, 8 px on / 13 px off, so tiled period 0.21 local; `Line.size.y` is floored to
  whole periods). The line's `scaleX` is `BaseTransformScale` (chart size × `GlobalNoteSizeMultiplier`, default
  1.1333), *not* the note's transform size (orthoSize 5 → 1.9717 for click/hold), so width = 0.56 × 1.1333 ≈ 0.635
  world vs click diameter 1.9717 × 1.1333 ≈ 2.235 → **0.284 × click diameter**. Chart `size` and the player's
  note-size setting scale both sides alike, so the ratio is fixed. During approach the width grows 0 → full with the
  note (`minPercentageLineSize = 0`).
- Drag line: stretched sprite between notes, leading edge introduced over the source note’s window, trailing edge retracts from source hit to destination hit.
- Sizes (relative to click): drag head 0.8, drag child 0.65, hold/long hold 1, flick 1.125, drop click 1, drop drag 0.8.
- Colours: ring white; fill Click/Hold/Flick `#35A7FF` / alt `#FF5964`, Drag/CDrag `#39E59E`, Long hold `#F2C85A`.
  Alt colour is chosen by **scan direction** (`ChartModel.UseAlternativeColor`, drop notes use their note direction).
- Grade colours: Perfect `#5BC0EB`, Great `#FDE74C`, Good `#9BC53D`, Bad `#E55934`, Miss `#333333`.
  Clear effect = FlatFX ring (24 sectors, 4 for flick), thickness 1.333 → 0.333, lifetime `0.4 / speed`
  with speed 1 / 0.9 / 0.7 / 0.5 / 0.3 for P / Gr / Go / B / M.

## Cylheim (Cytus II assets, reference only) — private research checkout

- Assets: individual RGBA PNG frames in `src/images/designer/`, no atlas. Name pattern
  `Note-<Kind>-<Phase>-Textures-<Name>_<00000>.png` (5-digit, zero padded).
- Loader: `src/components/chart-viewport/pixi-runtime-note-animation-provider.ts` (frame lists hard-coded, **30 fps**).
- Sampling: enter animation window **ends at the hit time**; frame = `floor(normalized * frameCount)`;
  if the note appears later than the clip length, the window is shortened (clip is time-compressed).
  Anchor (0.5, 0.5).
- Phases per kind: Enter (click 41f, drag 47f, flick 42f, hold 40f, long hold 43f), Holding button (in, then looped),
  Hold fire loop (31f), hold back decoration (enter + ping-pong loop), Bloom/clear (click/drag 10f, hold 18f, flick 19f).
- Hold lines / drag lines: stretched (hold) or repeated (drag) textures between anchors, progress via mask.
- Hold line width (default skin): `HoldLineIn` static frame `Hold_Line_Single_00046.png` — 100×21 px, opaque
  span 56 px, 8 px on / 13 px off: the same texture spec as Cytoid's `HoldLine.png`. Line thickness = texture
  width × `TextureScaleX` (1 for hold, 0.7 long hold) × note size × post scale (C# `NoteContainerLine`;
  Electron `getTexturedLineMetrics` = 100 × noteScale); note bodies = texture × `GetNoteTypeScale` (click 1,
  hold 0.83) × the same factors. Click static frame `Click_in_00041` visible 176–182 px → **line ≈ 0.31 × click**
  (≈ 0.29 × the hold body, 235 × 0.83 px) — in line with Cytoid's 0.284.
  Not to be confused with Cylheim-Electron's separate **Alpha skin** (`private-modules/alpha`), whose glowing
  `export-Hold_Boom_*` track is ≈ 0.56 × click — that is a different skin, not the default.
- Style is skeuomorphic (glows, noise, glitch pixels) — **not** reused; only the phase structure and output format are.
