/**
 * CLICK — circle, white ring, solid colour ball + growing core on a 1-2-3 depth scale.
 *
 * Timing feedback follows the structure of Cytus II's click (studied frame by
 * frame): a calm pre-roll, then an *accelerating* finish with converging
 * motion and a blink right before the hit. Linear growth reads as "somewhere
 * in the future"; acceleration + convergence + blink read as "NOW".
 *
 *  0.00–0.10  fade in
 *  0.00–0.50  note scales 0.62 → 1, ring assembles from 3 arcs (0–0.40)
 *  0.00–0.94  core grows ease-out (cubic) from a small dot to 0.8·inner — fast at spawn,
 *             settled well before the hit (no late rush to read);
 *             colours: core depth 2 → 3, background depth 2 → 1 (ease-in-out),
 *             with the lightness steps compressed (see DEPTH_CONTRAST)
 *  0.68–1.00  approach ring contracts *linearly in time* from 1.9 R onto the ring
 *             (thin, ≤ 25 % opacity — a peripheral cue, not a decoration)
 *  0.86–1.00  double blink: a lead-in flash (0.86–0.89) then the final blink (0.92–1);
 *             the core flashes white and the ring thickens, settling exactly at p = 1
 *             (the hit pose is calm and full)
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { hexToOklch, mix, oklch } from '../core/color'
import { bump, inOutQuad, lerp, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
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
export const CLICK_TIMING = { approachFrom: 0.68, coreFull: 0.94, blinkFrom: 0.92, readyBlinkFrom: 0.86 }

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
 * Depth 1-2-3 colour progression: 1 = track (darkest), 2 = deep, 3 = fill
 * (the note colour). Everything starts at depth 2; as the hit approaches the
 * core rises 2 → 3 while the background sinks 2 → 1, so contrast — not
 * whiteness — carries the timing, and the hit pose shows the true colour.
 *
 * The lightness gaps between the three stops are compressed by DEPTH_CONTRAST
 * (c = fill stays anchored; c-1 = deep and c-2 = track sit halfway toward it),
 * so the end-of-approach contrast spike is half as strong and less likely to
 * pull the eye away from the scan line.
 */
/** Fraction of the original lightness gaps kept between the three depth stops (1 = full spread). */
export const DEPTH_CONTRAST = 0.5

/** Move a colour's lightness part of the way toward another (hue/chroma kept). */
function stepToward(anchor: string, colour: string, k: number): string {
  const a = hexToOklch(anchor)
  const c = hexToOklch(colour)
  return oklch(a.l + (c.l - a.l) * k, c.c, c.h)
}

export function depthColors(p: number, ctx: DrawContext) {
  const k = inOutQuad(seg(p, 0.1, CLICK_TIMING.coreFull))
  const deep = stepToward(ctx.palette.fill, ctx.palette.deep, DEPTH_CONTRAST)
  const track = stepToward(ctx.palette.fill, ctx.palette.track, DEPTH_CONTRAST)
  return { base: mix(deep, track, k), core: mix(deep, ctx.palette.fill, k) }
}

export interface ClickOptions {
  /** extra glyph drawn above the core (click-drag head arrow) */
  glyph?: (p: number, ctx: DrawContext, inner: number) => SceneNode | null
}

export function clickEnter(p: number, ctx: DrawContext, o: ClickOptions = {}): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const hair = ctx.unit * tokens.stroke.hair
  const inner = R - W
  const a = outCubic(seg(p, 0, 0.1))
  const build = outQuart(seg(p, 0, 0.4))
  const scale = lerp(0.62, 1, outCubic(seg(p, 0, 0.5)))

  // core: small dot → full, ease-out — most of the growth happens right after
  // the spawn, then it settles; nothing accelerates toward the hit
  const g = outCubic(seg(p, 0, CLICK_TIMING.coreFull))
  // the core stops at 0.8·inner: a rim of the note colour stays visible at the hit (hue identity)
  const coreR = inner * CORE_MAX * lerp(0.16, 1, g) * seg(p, 0, 0.12)
  const blink = blinkAmount(p)
  const depth = depthColors(p, ctx)

  // approach ring: linear in time so its speed is readable; hairline-thick
  // (half of the original 1.2–2.2 × hair) and ≤ 25 % opacity — peripheral only
  const ap = seg(p, CLICK_TIMING.approachFrom, 1)
  const approach = ap > 0 && ap < 1
    ? ring(lerp(R * 1.9, R - W / 2, ap), hair * lerp(0.6, 1.1, ap), ctx.palette.ring, 0.25 * seg(ap, 0, 0.3))
    : null

  const body = group([
    // solid ball from the first frame; depth 2 → core rises to 3, background sinks to 1
    disk(inner + 0.5, depth.base),
    disk(coreR, depth.core),
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
    note: 'Core grows ease-out from the spawn and settles early; thin approach ring converges linearly over the last third, white blink right before the hit.',
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
