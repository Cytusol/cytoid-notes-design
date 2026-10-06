/**
 * CLICK — circle, white ring, solid colour ball + growing core on the 50–950 shade scale.
 *
 * Timing feedback follows Cytus II's click (measured frame by frame): a dim
 * pre-roll — which is also what tells the next page apart from the current
 * one — then a late, accelerating core, a visible converging ring and a
 * blink right before the hit.
 *
 *  0.00–0.10  fade in
 *  0.00–1.00  size follows the fitted Cytus II S-curve (`tokens.sizeCurve.click`):
 *             a small dim spawn (0.32), one smooth slow-fast-slow growth into a
 *             +12 % peak at p 0.88 — together with the lead-in blink and the
 *             converging ring — then a smooth settle, exactly 1.0 (the hit
 *             pose) from p 0.976
 *  0.00–0.10  fade in; 0–0.40 the outer ring assembles from 3 arcs
 *  0.25–0.85  shade split: core rises 700 → 400 (true colour), background sinks 700 → 800
 *             (full, uncompressed contrast — ΔL ≈ 0.3 at the hit, as Cytus II)
 *  0.42–0.94  core grows ease-in from a small dot to 0.8·inner — most of the
 *             growth lands in the last third
 *  0.70–1.00  approach ring contracts *linearly in time* from 1.83 R onto the ring
 *             (≈ 0.08 R thick, ≤ 50 % opacity)
 *  0.86–1.00  double blink: a lead-in flash (0.86–0.89) then the final blink (0.92–1);
 *             the core flashes white and the ring thickens, settling exactly at p = 1
 *             (the hit pose is calm and full)
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { bump, inOutQuad, inQuad, lerp, outCubic, outQuad, outQuart, riseSettleCurve, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tone } from '../palette'
import { tokens } from '../tokens'
import { makeClearClips, makeMissClip } from './effects'
import { arrowHead, assemblingRing, disk, ring } from './parts'

/** Ring stroke for a note of this size (thinner on small notes). */
export function ringWidth(ctx: DrawContext) {
  return ctx.unit * tokens.stroke.ring * (ctx.size / ctx.unit) ** 0.5
}

/** Max core radius relative to the inner radius. */
export const CORE_MAX = 0.8

/** Phase boundaries (normalised). */
export const CLICK_TIMING = {
  splitFrom: 0.25,
  splitTo: 0.85,
  coreFrom: 0.42,
  coreFull: 0.94,
  approachFrom: 0.7,
  readyBlinkFrom: 0.86,
  blinkFrom: 0.92,
}

/**
 * Core blink envelope: a lead-in blink (0.86–0.89) + the final one (0.92–1) — a double
 *  flash right before the hit.
 */
export function blinkAmount(p: number): number {
  return Math.max(
    bump(p, CLICK_TIMING.readyBlinkFrom, CLICK_TIMING.blinkFrom),
    bump(p, CLICK_TIMING.blinkFrom, 1),
  )
}

/**
 * Enter size at progress `p` (1 = hit pose): one fitted S-curve carries the
 * ball from the small dim spawn (0.32) up through the full-size crossing
 * (p ≈ 0.74) to the +12 % overshoot peak at p 0.878 — together with the
 * lead-in blink and the converging ring — and a second S settles it back to
 * exactly 1.0 by p 0.976. Anchors and shape are fitted to the measured Cytus
 * II frames (`tokens.sizeCurve`); the source's pixel staircase and texture
 * pops are not reproduced. The flick shares this curve.
 */
export const clickSize = riseSettleCurve(tokens.sizeCurve.click, tokens.sizeCurve.s)

/** Click/Flick spawn shade: the whole ball starts here before the split. */
export const SPAWN_SHADE = 700

/**
 * Shade progression on the palette scale (`tone`): everything starts at SPAWN_SHADE (700);
 * as the hit approaches the core rises 700 → 400 (the true colour) while the
 * background sinks 700 → 800, so contrast — not whiteness — carries the
 * timing, and the hit pose shows the true colour (Cytus II's ΔL ≈ 0.3).
 */
export function splitShades(p: number, ctx: DrawContext) {
  const k = outQuad(seg(p, CLICK_TIMING.splitFrom, CLICK_TIMING.splitTo))
  return { base: tone(ctx.palette, lerp(SPAWN_SHADE, 800, k)), core: tone(ctx.palette, lerp(SPAWN_SHADE, 400, k)), k }
}

/**
 * Page cue for notes without a timing gauge (hold, long hold, drag family):
 * their shape settles early but every shade sits WAKE_DROP steps darker until the
 * second half of the approach, so next-page notes read darker than the ones
 * about to be played — Cytus II separates pages by this dim → lit arc, not
 * by direction colour.
 */
export const WAKE = { from: 0.45, to: 0.7 }

export function wakeAmount(p: number): number {
  return inOutQuad(seg(p, WAKE.from, WAKE.to))
}

/** How many scale steps darker a note sits while asleep. */
export const WAKE_DROP = 200

/** Scale step of a shade whose lit step is `lit`: WAKE_DROP darker while asleep (w = 0). */
export function wakeShade(lit: number, w: number): number {
  return lit + WAKE_DROP * (1 - w)
}

export interface ClickOptions {
  /** extra glyph drawn above the core (click-drag head arrow) */
  glyph?: (p: number, ctx: DrawContext, inner: number) => SceneNode | null
}

/** Core size 0..1 shared with flick: a small dot that swells late (ease-in). */
export function coreGrowth(p: number): number {
  return lerp(0.24, 1, inQuad(seg(p, CLICK_TIMING.coreFrom, CLICK_TIMING.coreFull)))
}

export function clickEnter(p: number, ctx: DrawContext, o: ClickOptions = {}): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const hair = ctx.unit * tokens.stroke.hair
  const inner = R - W
  const a = outCubic(seg(p, 0, 0.1))
  const build = outQuart(seg(p, 0, 0.4))
  const scale = clickSize(p)

  // the core stops at 0.8·inner: a rim of the note colour stays visible at the hit (hue identity)
  const coreR = inner * CORE_MAX * coreGrowth(p)
  const blink = blinkAmount(p)
  const split = splitShades(p, ctx)

  // approach ring: linear in time so its speed is readable, Cytus II weight
  const ap = seg(p, CLICK_TIMING.approachFrom, 1)
  const approach = ap > 0 && ap < 1
    ? ring(lerp(R * 1.83, R - W / 2, ap), hair * lerp(1.5, 2.1, ap), ctx.palette.ring, 0.5 * seg(ap, 0, 0.15))
    : null

  const body = group([
    // solid ball from the first frame; 700 → core rises to 400, background sinks to 800
    disk(inner + 0.5, split.base),
    // the core fades in with the shade split — while it is still the base colour a
    // stacked translucent copy reads as a bright dot during the entry fade
    split.k > 0 ? disk(coreR, split.core, split.k) : null,
    blink > 0 ? disk(coreR, ctx.palette.ring, 0.6 * blink) : null,
    o.glyph?.(p, ctx, inner) ?? null,
    assemblingRing(R - W / 2, lerp(W * 0.45, W, build) * (1 + 0.25 * blink), ctx.palette.ring, 3, build, lerp(-TAU / 6, 0, build)),
  ].filter(Boolean) as SceneNode[], { transform: { scale } })

  return group([approach, body].filter(Boolean) as SceneNode[], { opacity: a })
}

/** White arrow (Cytoid CDragFill) pointing along the chain; `ctx.heading` rotates it. */
export function dragArrow(ctx: DrawContext, inner: number, show: number): SceneNode | null {
  if (show <= 0)
    return null
  return group([arrowHead(inner * 1.05, ctx.palette.ring)], {
    opacity: show,
    transform: { rotate: ctx.heading, scale: lerp(0.6, 1, show) },
  })
}

export const click: NoteDesign = {
  kind: 'click',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    draw: (p, ctx) => clickEnter(p, ctx),
    note: 'Size follows the fitted Cytus II S-curve: dim small spawn, one slow-fast-slow growth into the +12 % peak with the double blink, settled on the exact hit pose from p 0.976; approach ring converges linearly over the last 30 %.',
  },
  clear: makeClearClips({ shape: 'circle', reach: 1.45, sectors: 24, seed: 1 }),
  miss: makeMissClip('circle'),
}

export const clickDragHead: NoteDesign = {
  ...click,
  kind: 'click-drag-head',
  enter: {
    ...click.enter,
    draw: (p, ctx) => clickEnter(p, ctx, { glyph: (pp, c, inner) => dragArrow(c, inner * 0.62, outCubic(seg(pp, 0.1, 0.3))) }),
    note: 'Click timing + white arrow pointing along the chain (rotate by heading).',
  },
}
