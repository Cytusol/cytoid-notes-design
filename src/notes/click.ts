/**
 * CLICK — circle, white ring, solid deep base + fill core (reads as a ball, not a ring).
 *
 * Timing feedback follows the structure of Cytus II's click (studied frame by
 * frame): a calm pre-roll, then an *accelerating* finish with converging
 * motion and a blink right before the hit. Linear growth reads as "somewhere
 * in the future"; acceleration + convergence + blink read as "NOW".
 *
 *  0.00–0.10  fade in
 *  0.00–0.50  note scales 0.62 → 1, ring assembles from 3 arcs (0–0.40)
 *  0.00–0.94  core grows ease-in (cubic) from a small dot to full — slow, then fast
 *  0.68–1.00  approach ring contracts *linearly in time* from 1.9 R onto the ring
 *             (thin, ≤ 50 % opacity — a peripheral cue, not a decoration)
 *  0.92–1.00  blink: core flashes white and the ring thickens, settling exactly
 *             at p = 1 (the hit pose is calm and full)
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { bump, inCubic, lerp, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { makeClearClips, makeMissClip } from './effects'
import { arrowHead, assemblingRing, disk, ring } from './parts'

/** Ring stroke for a note of this size (thinner on small notes). */
export function ringWidth(ctx: DrawContext) {
  return ctx.unit * tokens.stroke.ring * (ctx.size / ctx.unit) ** 0.5
}

/** Phase boundaries (normalised). */
export const CLICK_TIMING = { approachFrom: 0.68, coreFull: 0.94, blinkFrom: 0.92 }

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

  // core: small dot → full, accelerating
  const g = inCubic(seg(p, 0.08, CLICK_TIMING.coreFull))
  const coreR = inner * lerp(0.16, 1, g) * seg(p, 0.02, 0.12)
  const blink = bump(p, CLICK_TIMING.blinkFrom, 1)

  // approach ring: linear in time so its speed is readable
  const ap = seg(p, CLICK_TIMING.approachFrom, 1)
  const approach = ap > 0 && ap < 1
    ? ring(lerp(R * 1.9, R - W / 2, ap), hair * lerp(1.2, 2.2, ap), ctx.palette.ring, 0.5 * seg(ap, 0, 0.3))
    : null

  const body = group([
    // solid deep base: the note reads as a filled ball from the first frame, not a hollow ring
    disk(inner + 0.5, ctx.palette.deep),
    disk(coreR, ctx.palette.fill),
    blink > 0 ? disk(coreR, ctx.palette.ring, 0.75 * blink) : null,
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
    note: 'Cytus II-style timing: calm pre-roll, core grows ease-in, thin approach ring converges linearly over the last third, white blink right before the hit.',
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
