# Cytoid Notes — Flat Design Specification

> The code is the spec: `src/notes/*.ts` is the single source of truth; this document explains intent and integration. For numbers, see `src/tokens.ts`.

## 1. Design Principles

1. **Strictly flat**: solid fills and strokes only. No gradients, glows, noise or textures — only a little opacity. Every animation is built from translation, scale, stroke width and opacity of geometric primitives (circle, arc, rectangle, polygon, line segment).
2. **Keep Cytoid's identity**: round notes, white outer ring, two-ring hold, diamond flick, arrowed drag head, solid-circle drag child, static capsule drop, white dashed drag line, and scan-direction colouring all stay. Sizes follow measured *visible* bodies (see §2) rather than Cytoid's transform ratios.
3. **Timing cues only where needed**:
   - Click and Flick are played on the beat. Their timing feedback follows Cytus II's structure: a calm (dim, small) pre-roll, an accelerating finish, and a blink right before the judgement. Linear growth only says "still early"; acceleration, convergence and blinking say "now". Cytus II also never stops growing its size until the very end — the body crosses its final size at p ≈ 0.74–0.78, decelerates into a +3…6 % overshoot peak and settles back. The whole size flow is one clean motion per kind (**one slow-fast-slow S-curve** up to the overshoot peak, then one S settle — `tokens.sizeCurve`, analytic cubic-bezier(0.7, 0, 0.75, 1) fitted to the measured frames): anchors (spawn size, peak timing/amount, exact hit pose at p = 1) are preserved, while the source's pixel-quantisation staircase and single-frame texture pops are deliberately not reproduced (individual noisy frames may deviate up to ≈ 0.1·R mid-approach). Hold is excluded: Cytus II holds shrink slowly all the way, which here is the progress ring's job.
   - Holds can be pressed early and the drag family only follows a path. They offer no timing read-out: the wake (p 0.45–0.7) is colour-only and the ring/arrow/glyph assemble by p 0.2; the size curve still plays (as in Cytus II), but nothing on the note tracks the beat.
   - **Page cue (dim → lit)**: like Cytus II, every timed note spends the first half of its approach 200 shade steps darker and only lights up to its true colour in the second half. Notes still on the next page therefore read dimmer than the ones about to be played; the direction colours (blue/red) are not what separates the pages. Click/Flick do it through the shade split, holds and the drag family through the `WAKE` window (p 0.45–0.7, colour only, shape unchanged).
4. **Restrained external hints**: decorations outside the note (the lock ticks, the corner brackets) are peripheral only — low opacity, small displacement, never competing with chart reading.
5. **Shape over colour**: every note has a distinct silhouette so colour-blind players can tell them apart by shape alone:
   - Click: solid coloured ball whose inner core grows, with the 700 → 400 / 800 shade split;
   - Hold: outer ring plus a borderless dark core and a static centre circle;
   - Long hold: outer ring plus a borderless dark core and a static centre square, plus corner brackets;
   - Drag head and click drag head: a white arrow pointing along the chain;
   - Drag child: a solid coloured circle;
   - Drop drag: two notch marks.

   The click drag child shares the drag child's shape and is told apart by colour only.
6. **Small clear effects**: effects stay within roughly 1.5× the note's outer radius, so dense sections never glare.

## 2. Coordinates and Sizes

- The design unit is `unit = 128px`, the click's outer diameter. Primitive coordinates use the note centre as origin, +y down; angle 0 points at 12 o'clock and grows clockwise.
- Sizes relative to the click: drag head 0.675 (Cytoid's measured *visible* body), drag child 0.375, flick 1.125, drop drag 0.8, everything else 1. The click drag head matches the click. The drag head / child no longer follow Cytoid's transform ratios (0.8 / 0.65): measured by visible body, Cytoid actually renders 0.675 / 0.274 (sprite insets + child scales) while Cytus II renders 0.99 / 0.49 — a head : child ratio of 2–2.5 : 1 in both. We take the head at Cytoid's measured 0.675 and the child at a compromise 0.375, giving ≈ 1.8 : 1.
- Strokes and widths (in units u):
  - main ring 0.085u, hairline 0.022u;
  - **ring edge keyline 0.34 × ring width** (`tokens.stroke.edge`): the ring band is *split*, not widened — the outer 34 % is a dark keyline (`tokens.edge` #1A1B22, achromatic, between the stage #16171D and ink #1C1D24), the white band shows W−e. The outer radius and total width stay exactly as calibrated. This is the flat answer to overlapping notes (two white rings would merge into one blob): Cytus II separates them with a dark rim plus a faint outer feather — measured on the Cylheim assets (click/drag: ring band RGB ≈ 202, dark band luminance ≈ 39–93 at ≈ 80 % alpha, feather α ≈ 7 %) — and the flat reduction keeps only the solid rim. The keyline is near-invisible against the stage (an isolated note's silhouette is unchanged) and crisp against another note, so it only “appears” on overlap. Constant colour — no wake of its own (Cytus II's rim is likewise always present) — and it shares the ring's assembly motion. Applies to every ring-bearing note (click family, drag head, hold / long hold, flick diamond, drop capsules); gauges (approach ring, hold progress ring, brackets) and drag children (no ring) are excluded;
  - **hold body (progress bar) width 0.284u**, identical for the long hold, from Cytoid's HoldLine;
  - hold progress ring: centre radius 1.34R, width 0.083u, from Cytoid's ProgressRing;
  - **drag line width 0.0716u**, white dashed, 0.0358u dash and gap, from Cytoid's DragLine.

## 3. Colour System (hue driven)

- Colour families map one-to-one onto Cytoid's fill slots: `click / hold / flick / long-hold / drag / click-drag / drop-click / drop-drag`. Every family has **up / down** scan-direction variants, matching Cytoid's `UseAlternativeColor`.
- The user only picks an **OKLCH hue**; lightness and chroma derive from `fitLightness(h)` and `tokens.chroma`. Yellow-greens are brightened automatically, so every hue carries the same visual weight as the defaults. Safer — and better UX — than picking raw hex.
- Each hue derives a **Tailwind-style shade scale `50 · 100 · 200 … 900 · 950`** (`SHADES`), plus `ring` (outer ring and lines, default neutral 50 `#FAFAFA`) and `ink` (glyphs on fills):
  - **400 is the true colour** (`BASE_SHADE`) — the input hue/hex lands exactly there. Our default lightness (≈0.705) sits on Tailwind's OKLCH 400 curve.
  - Lighter steps move a fixed fraction of the way from 400's lightness toward 0.985; darker steps scale it down; chroma is a fixed multiple of 400's (table `SCALE` in `src/palette.ts`). So the scale keeps its shape for every hue, including brightened yellow-greens and raw hex inputs.
  - Steps in use: **400** fills (note bodies, completed hold bars, drops); **600** the spawn ball, hold core and ping, flick slit, drag-child hairline, drop-drag notches; **800** dim bases, unfilled tracks, miss ghosts; **300** hold ripples. (These replace the former `fill` / `deep` / `track` / `light` roles one-to-one; default blue/red are unchanged to within 1 RGB level.)
  - `tone(palette, step)` samples the scale at any fractional step, piecewise-linear in OKLCH between neighbouring shades (exact steps return the scale colour; clamped to 50–950). Every in-note colour that moves between shades — the click/flick split, the hold head, the wake page cue — is expressed as a step on this scale, never as an ad-hoc mix.
  - The ring is an **achromatic neutral material**, not pure white: it spawns at neutral 400 (oklch 0.708) and rises to the resting `ring` tone (neutral 50, oklch 0.985) on the same envelope that wakes the fills — `ringTone(palette, k)`. Before this, a pure-#FFF border paired with the dimmed entry body made the spawn pose the highest-contrast frame on screen (ΔL 0.54 against the 700 ball, 0.79 against the stage); starting at neutral 400 roughly halves both gaps and the border brightens together with the note it belongs to.
- Cytoid custom colours are compatible: a family override may also be a `#rrggbb` value, in which case that colour's own lightness and chroma are kept and it is **not** affected by `hueShift`.
- A global `hueShift`, `saturation` (0 = monochrome) and a `ring` colour are also supported.
- Grade colours follow Cytoid's defaults: Perfect `#5BC0EB`, Great `#FDE74C`, Good `#9BC53D`, Bad `#E55934`. Miss becomes a neutral grey `#6B6F7A` so it reads on the dark background.

Default hues (up / down):

| Family | up | down |
|---|---|---|
| Click, Hold, Flick, Drop click | 247 (blue) | 20 (red) |
| **Click drag (head and child)** | 247 (blue) | 20 (red), matching Click |
| Long hold | 88 (gold) | 70 (amber) |
| Drag, Drop drag | 160 (green) | 160 (green) |

The click drag remains its own family and can be re-coloured independently.

## 4. The Clip Model

Every note is composed of clips; the meaning of a clip's parameter `x` depends on its `mode`:

| mode | x | used by |
|---|---|---|
| `normalized` | entry progress p ∈ [0,1]; the window ends at the hit time | enter; nominal length 1.2 s, stretched to the real intro→hit window |
| `static` | ignored | the drop still image (baked as 1 frame) |
| `once` | seconds since judgement | clear-perfect/great/good/bad, miss |
| `loop` | seconds, period = duration, seamless | hold-loop (0.6 s) |
| `progress` | gameplay progress ∈ [0,1] | hold-progress |

A hold's active phase stacks three layers, bottom to top: `press` (the note body), `loop` (an animation inside the body) and `progress` (the progress ring). The split means frame animations compose at runtime exactly like the vector version.

## 5. Per-Kind Specification

p is the entry progress. Ranges below are p values, e.g. "0–0.1 fade in".

### Click / Click drag head
- **Structure**: solid ball, core and neutral outer ring, coloured on the **shade scale**:
  - the ring spawns at neutral 400 and rises to neutral 50 with the shade split (0.4–0.85) — during the dim pre-roll the border sits between the 700 ball (L 0.47) and the resting ring (L 0.985) instead of blazing white;
  - at first the ball and core are both 700 (`SPAWN_SHADE`) — the note reads as one solid-coloured ball;
  - as the hit approaches, the core rises from 700 to 400 (the true colour) and grows while the background sinks from 700 to 800;
  - the colour progression runs 0.4–0.85 (ease-out). Before 0.4 the core (already at 0.36) sits blended into the 700 ball — one flat disc, no internal motion to read; the deferred differentiation is what reveals the late core growth;
  - the spawn sits at 700 (L≈0.47 for the defaults; 800 L≈0.39, 400 L≈0.70) — darker than the measured Cytus II spawn ball (L 0.53, ≈ 600) so the start reads clearly dim. As in Cytus II the base then sinks to L 0.39 and the core rises to 0.70 — a lightness gap of ≈ 0.3 at the hit. (An earlier round halved this gap; players then could only read timing from the scan line.)
- **Timing feedback**: modelled frame-by-frame on Cytus II's click (41 frames). The original: a dim ball with a tiny core for the first half; the core grows mostly in the second half (0.16R at p 0.44 → 0.65R at p 0.93, accelerating); from p≈0.73 a white concentric ring (α≈0.5, ≈0.08R thick) converges linearly from 1.74R onto the ring; a near-white flash at p≈0.95. The flat equivalent:
  - 0–0.1 fade in; 0–0.4 the outer ring assembles from 3 arcs (at the spawn tone, neutral 400 — it wakes with the split). The size is not hand-timed at all — see the fitted curve below.
  - 0.42–0.94 the core grows from 0.36 (large, barely moving early — stable, not lively) to 0.8× the inner radius with **ease-in (quad)** — most of the growth lands in the last third. At the hit the core is the true colour with an 800 rim left around it.
  - 0.7–1 a white hairline **approach ring** converges from 1.83R onto the ring **linearly in time**, 0.375–0.525× the hairline thick, up to 0.5 opacity (Cytus II's band reads as a hairline once its bloom glow is discounted); the linear motion keeps the speed readable.
  - 0.86–0.89 the **lead-in blink**: the same flash as the finale right before it (white core α 0.3 — halved from the measured strength to keep it a hint, not a strobe), forming a double-blink rhythm; the ring's width is untouched — the blink lives on the core only;
  - 0.92–1 the **final blink**: the core flashes white (up to α 0.3); the ring width has already settled (its only motion is the 0–0.4 assembly) and stays stable to p = 1.
  - 0–1 the **fitted size curve** `tokens.sizeCurve.click` — one S-curve (cubic-bezier 0.7/0.75, fitted to the measured frames) from the small dim spawn at 0.32 across the full-size crossing (p ≈ 0.74) to the **+6 % peak at p 0.88** — together with the lead-in blink and the converging ring arriving — then one S settle, exactly 1.0 (the hit pose) from p 0.976. The flick shares this curve. The approach ring keeps its fixed linear path; at the peak the body edge still stays inside it.
- **Click drag head**: identical timing to the click, with a white arrow over the core pointing at the next chain node (`heading`).

### Hold
- **Shape**, clearly distinct from the click:
  - a thick outer ring;
  - a **600 dark core** at radius 0.55R with no border, positioned at Cytoid HoldNoteRing's inner ring;
  - a **static** small white circle at the core's centre (radius 0.2R).

  Holds carry no arrows — arrows would suggest dragging.
- **Entry**: holds can be pressed early, so there is **no timing read-out**. 0–0.35 snap into shape, 0.2–0.42 the centre circle pops in, then the internals stay still. The **size follows the same fitted S-curve as the click** (`tokens.sizeCurve.hold` = click's anchors on purpose) so hold and click read the same size flow during the approach. The colours **wake** over p 0.45–0.7: before that the ball sits at 600 and the core at 800, afterwards ball 400 and core 600 (`HOLD_CORE`). The white material (outer ring, centre glyph, long-hold brackets) rides the same wake as a neutral ramp — neutral 400 → 50 (`ringTone`).
- **press** (0.2 s): the body sinks to 0.86; the centre circle stays put.
- **loop** (0.6 s, drawn above the body, seamless):
  - **inner ping**: the dark core itself plays a Tailwind `animate-ping`-style animation. Every half period (same frequency and phase as the outer ripples) a copy of the core disc scales to 2× and fades out over the first 75%, curve ≈ cubic-bezier(0, 0, 0.2, 1). The copy is clipped to the head's inner radius so it never dims the white ring; the centre glyph stays still, drawn on top.
  - **outer pulses**: two thin light-coloured ripples, half a period apart, expanding outside the progress ring.
- **progress**: Cytoid ProgressRing's position and width (centre radius 1.34R, width 0.083u). The white lead spans 4/3·p, the fill spans p.
- **Body (progress bar)** `holdBody`:
  - width 0.284u, same as Cytoid (Cytus II's default skin is ≈ 0.31u from the same 56/100 px line texture; see `docs/research/references.md`);
  - unrolls from under the head at entry progress 0.3–0.9;
  - the centre dashes scroll toward the head while held;
  - the completed part is solid fill with a white midline;
  - **end: rounded + full stop.** The far end is a half-circle drawn *inside* the hold length (the end point does not move). The conveyor stops `holdEndLength` (0.9 × body width) before the end, leaving a gap and one dim neutral-400 dot (radius 2.2 hairlines) at the centre of the half-circle — no white, no overhang, nothing parallel to the scanline, so it stays quiet while reading. At progress 0.9–1 the dot lights white and pops to 3.2 hairlines (outBack), meeting the white midline: the release cue. Replaces the earlier white bar (1.7× body width), which read like a scanline segment or a neighbour's ring.

- **clear (at the hold end)**: like Cytus II, the burst plays where the scanline is the moment the hold completes — the note's **end position** (for a hold that is the body's far end, where the full-stop dot has just lit at progress 0.9–1). That dot is the seed of the effect: the opening flash is a grade-colour disc of **body width** (`ClearFlavor.flash = 'tail'`), then the shared grammar takes over (shock + double ring, sector ring, shards — all rotation-free, so one bake serves either body direction). Misses stay on the head: an early release happens at the scanline. The clips stay origin-centred; the anchor is the consumer's (Cylheim positions its Hold_Boom at the hold end natively).

### Long hold
- Same as hold, with three differences:
  - gold;
  - the centre glyph is a **square** sized to match the circle's visual area (half-side = 0.82 × circle radius);
  - the corner brackets converge from 1.6R to 1.28R at 0.1–0.45.
- **Body** `longHoldBody`: a full-height rail through the play area, same width as hold. The completed part extends from the note toward both edges at once. **Final-stage collapse**: at progress 0.86→1.0 the whole pillar (track, rails and done fill) narrows from left and right toward its centre down to 15% width (the Cytus II LongHold_Line end-stage collapse, progress-keyed — longer holds collapse more slowly), easing fast-then-slow (`LONG_HOLD_SHRINK_EASE`, currently outSine).
- **clear**: the same rule as hold — the burst plays at the **scanline's position the moment the hold completes** (the note's end position). The pillar is drawn full-height but only ends in *time*: its end is wherever the line then is, mid-board — not the screen edge. Adds a vertical beam that extends ~3R up and down, then narrows and fades, landing on the pillar line.

### Drag series (Drag head / Drag child / Click drag child)
- Players only follow the path, so the ring, arrow and hairline **assemble by p = 0.2** and the wake (p 0.45–0.7) is colour-only — nothing on the note tracks the beat. The **size follows the fitted Cytus II S-curves** (`tokens.sizeCurve.dragHead` / `.dragChild`): spawn 0.29 / 0.26, one smooth growth into the **+5 % / +3 % peak at p 0.77**, settled back to exactly 1.0 from p 0.87 / 0.85. Only the fill wakes from 600 to 400 over p 0.45–0.7 (the page cue; the child’s hairline goes 800 → 600 with it, and the head's ring + arrow wake neutral 400 → 50 on the same window).
- **Drag head**: neutral ring (wakes 400 → 50), full fill, plus a **matching arrow** pointing along the chain (Cytoid's CDragFill shape).
  - The arrow angle comes from `createContext(..., { heading })`: 0 points up, clockwise positive.
  - Frames are baked arrow-up; rotate the whole sprite in use — the round body is rotationally symmetric, so rotation is invisible on it.
  - **After triggering (hit or miss)**: the head follows the scan line along the connection, drawn with the drag head entry's **last frame** (the steady pose, matching how it looked at the moment of triggering); a click drag head uses the same last frame in Click-family colours.
- **Drag child**: a **solid coloured circle**, same as Cytoid. The only inner decoration is a low-contrast 600 hairline ring at 0.62R — never attention-grabbing, never interfering with reading node positions.
- **Click drag child**: identical to the drag child; only the colour follows Click.
- **Connection** `dragLine`: **unchanged from Cytoid**.
  - white dashed, 0.0716u wide, 50% duty;
  - the dash pattern is anchored to the source note;
  - `lead` grows from the source note's entry window; `trail` retracts from the source as the scan line passes.

### Flick
- **Structure**: a diamond outline, diamond base and diamond core (the same shade split as the click), plus a centre vertical slit (600). The side chevrons open at 90°. The slit is a flat nod to Cytoid's split diamond. The core shares the click's timing language: dim pre-roll, late ease-in growth and a double blink (0.86–0.89 + 0.92–1), and the diamond body plays **Click's fitted size curve** (`CLICK_SIZE`; Cytus II's own flick curve instead shrinks steadily and swaps to a larger white hit diamond on the final frame). The chevrons do not scale with it: they sit far enough outside the swollen diamond.
- **Entry**:
  - 0–0.45 the diamond's four edges grow from their midpoints (at the spawn tone, neutral 400 — the outline wakes neutral 400 → 50 with the split, like the click's ring);
  - the centre slit appears with the core: its length follows the core's ease-out growth, opacity easing out over 0.05–0.45;
  - the two outward chevrons **dash in late** on the body's rise–settle language (explicit windows, `tokens.sizeCurve.s` shape): a short 0.30u flight over 0.25–0.5 (the slow S ramp hides under the 0.32–0.45 fade-in), overshooting ~16 px past rest (deepest ~p 0.5, just after the old 0.45 stop); the relax back spans the diamond's whole growth (settled 0.875) — the body swells faster than the arrows retreat, so the visual body–arrow gap only ever closes; from 0.875 the pairs sit locked while the body plays its hit-pose settle. They ride the same neutral wake as the outline (the later approach pair stays at the resting tone — it is a timing gauge);
  - 0.7–1 a thinner **approach chevron pair** (α ≤ 0.5) converges linearly from 0.35u outside onto them — the flick's approach ring, after Cytus II's second chevron pair.
- **clear**: 4 sector arcs, plus two shorter horizontal impact bars left and right and horizontal shards, plus **V-shaped arrows sweeping right** marking the swipe direction. The arrows are **dashed, wide**, about as tall as the centre slit (~0.76R), thick-stroked, opacity ≤ 0.42. Their opening is 90°, matching the flick diamond's corner and the note's side chevrons; size, angle and stroke never change — only position and opacity. Counts: Perfect 3, Great 2, Good and Bad 1 each, staggered 0.08 apart.
  - The animation is baked right-facing. For a left swipe rotate the whole effect 180°; any future direction support rotates likewise.

### Drop click / Drop drag
- **A static image with no entry animation**, matching Cytoid and Cytus II. The fall offset is computed by the consumer. One frame is baked.
- A horizontal capsule; drop click is 1.15 × 0.3 size.
  - **Drop click**: white edge, fill and a white core bar;
  - **Drop drag**: shorter, no core bar, replaced by two 600 vertical notches; not connected to other notes.

### Clear effects (one grammar for every kind, deliberately small)
Every effect plays at an overall **50 % opacity** (`EFFECT_ALPHA`): the burst marks the hit without hiding the notes around it; the judgement text is unaffected. **Anchor**: on the note — except the hold family, whose clears play at the **scanline's position the moment the hold completes** (Cytus II behaviour; the note's end position; see §Hold).
1. **Colour flash**: 0–0.32, the note shape scales to 1.08× in the **grade colour** then collapses, peak opacity 0.25 (no white: a full-size white disc distracted from the scene and washed out the judgement text; the solid shape is only a mild colour confirmation). Holds flash a **body-width disc** instead (`flash: 'tail'`): at the hold end there is no note — the flash is the release dot detonating.
2. **Shock ring**: radius 0.95R → reach·R (outExpo), stroke 1.6W → 0.35W (matching FlatFX's 1.333 → 0.333), peak opacity 0.5.
   reach: click 1.45, drag 1.4, flick 1.4, hold 1.5, long hold 1.6, drop 1.3. Grades scale it: Perfect 1, Great 0.9, Good 0.75, Bad 0.6.
3. **Sector ring**: Perfect and Great only. 24 sectors, 4 for flick; sitting between 0.8 and 1.02× reach, duty falling from 0.62 to 0.12.
4. **Square shards**: Perfect 6 (white), Great 4, Good 3, Bad none. Shards fly out to 1.12× reach from deterministic randomness — baked results are reproducible.
5. **Per-kind extras**: hold and click add a second ring, long hold a vertical beam, flick horizontal impact bars and right-sweeping swipe arrows.

Lower grades last longer and reach less: Perfect 0.42 s, Great 0.46 s, Good 0.52 s, Bad 0.56 s.
**Miss** (0.5 s, also at the 50 % overall opacity): the note powers down to the dim 800 shade, the outer ring greys and shrinks inward with a slight sink. No cross is drawn; the MISS text carries the meaning. The ghost follows each note's own steady end pose: the drag child / click drag child have no outer ring and keep their inner 600 hairline as they shrink (other round notes keep the "disc + grey ring" structure).

### Judgement text (PERFECT / GREAT / GOOD / BAD / MISS)
- **Position**: centred on the effect (the note centre; the hold end for hold clears), played alongside the clear or miss effect with the same duration.
- **Typeface**: a custom monoline, 45°-chamfered geometric capital set; only the 14 letters in use are defined.
  - Glyphs are drawn with the same polyline primitives as the notes — no font files — so Canvas, SVG/resvg baking and a Unity port all render identically;
  - cap height 0.12u (down from the original 0.17u, to reduce glare), stroke 0.18 × cap height, mitred corners, square caps, matching the flat geometric style.
- **Colour**: follows the grade. The MISS grey is lifted 35% so it reads over the dim ghost.
- **Animation** (u = t / duration):
  - 0–0.4 letter tracking closes from 1.0× cap height to 0.32×;
  - from 0.02 each letter pops in staggered 0.035 apart (scale 0.4→1, outBack);
  - 0.05–0.4 a thin underline grows from the centre (none for MISS);
  - throughout, the text rises 0.12× cap height (MISS sinks instead);
  - 0.7–1 fade out.
- **Toggle**: `renderNote(kind, state, ctx, { judgement: false })` hides the text; on its own it is `renderJudgement(grade, t, ctx)`. The playground gallery, inspector and chart preview all provide a "Judgement text" toggle for comparison.
- **Frames**: baked once per grade (independent of note kind and direction) into `judgement/<grade>`, anchored at the text centre — overlay at the note centre. With `--cylheim`, PERFECT is additionally emitted as `PERFECT_Gold_top_00146–00158.png`.

## 6. Deliverables

### Vector (Cytoid's current approach)
- `renderNote(kind, state, ctx)` returns a scene tree; `holdBody / longHoldBody / dragLine` handle the stretchable parts.
- The tree contains only 6 primitive kinds, mapping one-to-one onto Unity's Shapes, LineRenderer or SpriteShape — or Cytoid's existing ring/fill sprites with masks.
- Every animation is a combination of `seg / lerp / ease` with no state, portable line by line to C#. See `src/core/ease.ts`.
- **Opacity convention**: group opacity **multiplies down onto leaf primitives** with no offscreen composition; a primitive's fill and stroke blend separately. That is exactly how per-sprite alpha behaves in a game engine, so Canvas preview, SVG/resvg baking and a Unity port all agree.
- `createContext`'s `direction` only selects colours (Cytoid's `UseAlternativeColor`, which consumers compute by Cytoid's own rules, including `is_forward` and the drop `NoteDirection`). The hold body and arrow orientations follow a separate `bodyDirection`, defaulting to `direction`, to support storyboard overrides and reversed pages.

### Frames (the Cytus II / Cylheim approach)
- `pnpm bake` (flags in `packages/notes/scripts/bake.ts`) writes to `<out>/`:
  - `manifest.json`, format `cytoid-notes/frames@1`: fps, each clip's mode, frame count, frame size, anchor and sampling formula;
  - `<kind>/<dir>/<clip>/<clip>_00000.png`: individual frames;
  - `<kind>/<dir>/<clip>.sheet.png`: sheet, with rows and columns in the manifest;
  - `bodies/<dir>/<family>/*.png`: tileable hold / long hold body strips and the white dashed drag line;
  - `cylheim/` (with `--cylheim`): Cylheim's `src/images/designer` file names and frame numbers. Frames are reverse-sampled along Cylheim's frame timelines (including repeated frames) so the animation rhythm matches the vector version exactly.
- **Sampling**: `normalized` clips use right-endpoint sampling — frame i draws p = (i+1)/N, and playback takes `i = min(N−1, floor(p·N))`. Each frame therefore shows the pose at the end of its time slice, at most 1/N ahead of continuous time, with the last frame exactly at the hit pose. Cylheim samples the same way.
- Frame anchors are all centre (0.5, 0.5). Canvases are cropped symmetrically around the bounding box of every frame.
- Colours are baked in. For custom hues re-bake with `--palette palette.json`, or rotate all hues with `--hue-shift`.

### Cylheim adaptation notes
- Enter (click / hold / long hold / drag / drag child / flick), drop stills (`Note-DropClick.png` / `Note-DropDrag.png`, width-aligned to the originals) and Bloom (click / drag / flick / hold / long hold) drop straight in.
  - Frame timelines: Enter at 30 fps (with repeated frames); Bloom at 51 fps — the first 3–4 frames show once, the rest twice. Baking reverse-samples each frame at its actual display time. Because Cylheim's bloom windows differ per family (0.33–0.67 s), our 0.42 s effect is compressed or stretched uniformly into that window.
  - Sizes: Cylheim multiplies by its own display scales (hold / long hold ×0.83, drag head ×0.8, drag child ×0.42, flick ×0.8). Baking pre-scales by `174px / 128 ÷ scale` to cancel it, so on-screen sizes still match this design. Once a hold starts, Cylheim's scale becomes ×1 and the button sequence is baked at ×1 too.
  - Hold frames 17–40 are preloaded for grouped popups; odd frames 25–39 are not on the normal timeline and are filled by interpolation over frame numbers.
  - Cylheim renders the click drag head with the drag textures, while this design styles it as a click plus an arrow. Also, the drag textures' arrows point up — Cylheim must rotate the sprite along the chain.
- Hold button and fire sequences are exported under their original names, but Cylheim loops button and plays fire with an 83px anchor offset and additive blending — a small adapter on the Cylheim side is needed. The better fix is a provider that reads `manifest.json` directly.
