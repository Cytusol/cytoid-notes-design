/**
 * HOLD / LONG HOLD — double-ring head + body (the "progress bar").
 *
 * Holds may be pressed early, so the head carries **no timing gauge**: it
 * reaches a steady pose quickly and reads as a different *shape* from a
 * click — Cytoid's double ring (thick outer ring + hairline inner ring) and a
 * centre glyph: a circle (hold) or a square (long hold, + corner brackets).
 * No arrows: arrows would suggest dragging.
 *
 * Holding is split into independent layers (frame-friendly), composed as
 * press → loop → progress (bottom to top):
 *   press    (once, 0.2 s)   head sinks to 0.86 scale, glyph folds away
 *   loop     (loop, 0.6 s)   the glyph keeps contracting inward (seamless)
 *   progress (progress 0–1)  Cytoid-style progress ring: white lead (4/3·p) + fill (p)
 * Bodies (see ./bodies.ts) are stretched elements, not frame clips.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { inOutCubic, inQuad, lerp, outBack, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { ringWidth } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { arc, assemblingRing, disk, ring } from './parts'

const PRESSED = 0.86
/** Cytoid ProgressRing: outer radius ≈ 1.42 R, thickness ≈ 0.083 u */
const PROGRESS_R = 1.34

/** Centre glyph: circle (hold) or square (long hold), outline only. `r` = circle radius / square half-size. */
function glyphShape(long: boolean, r: number, width: number, color: string, opacity = 1): SceneNode {
  return long
    ? { type: 'rect', x: -r, y: -r, w: r * 2, h: r * 2, stroke: color, strokeWidth: width, join: 'miter', opacity }
    : ring(r, width, color, opacity)
}

const INNER_RING = 0.55
const GLYPH = 0.26

/** Steady-state head; `k` = build progress 0..1 (fast), `glyph` = centre glyph reveal. */
function holdHead(ctx: DrawContext, long: boolean, k: number, glyph: number): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const inner = R - W
  // Cytoid HoldNoteRing proportions; the inner ring is a ~1 px hairline
  const innerRingR = R * INNER_RING
  const innerRingW = ctx.unit * tokens.stroke.fine
  const gw = ctx.unit * tokens.stroke.hair * 1.6
  return group([
    disk(inner + 0.5, ctx.palette.fill, k),
    assemblingRing(innerRingR, innerRingW, ctx.palette.ring, 4, outQuart(seg(k, 0.25, 1)), lerp(TAU / 8, 0, k)),
    glyph > 0 ? group([glyphShape(long, R * GLYPH, gw, ctx.palette.ring)], { opacity: seg(glyph, 0, 0.5), transform: { scale: lerp(0.4, 1, outBack(glyph, 2)) } }) : null,
    assemblingRing(R - W / 2, lerp(W * 0.5, W, k), ctx.palette.ring, 2, outQuart(k), lerp(-TAU / 4, 0, k)),
  ].filter(Boolean) as SceneNode[])
}

function brackets(R: number, k: number, ctx: DrawContext, opacity: number): SceneNode {
  const W = ctx.unit * tokens.stroke.hair * 2
  const r = lerp(R * 1.6, R * 1.28, k)
  const L = R * 0.36
  const items: SceneNode[] = []
  for (let i = 0; i < 4; i++) {
    const sx = i % 2 ? 1 : -1
    const sy = i < 2 ? -1 : 1
    const cx = (sx * r) / Math.SQRT2
    const cy = (sy * r) / Math.SQRT2
    items.push({
      type: 'poly',
      points: [[cx, cy - sy * L], [cx, cy], [cx - sx * L, cy]],
      stroke: ctx.palette.ring,
      strokeWidth: W,
      join: 'miter',
    })
  }
  return group(items, { opacity })
}

function holdEnter(long: boolean) {
  return (p: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    // steady by p = 0.35 — no timing to read on a hold head
    const k = outCubic(seg(p, 0, 0.35))
    const glyph = seg(p, 0.2, 0.42)
    const head = holdHead(ctx, long, k, glyph)
    const extra = long ? brackets(R, inOutCubic(seg(p, 0.1, 0.45)), ctx, seg(p, 0.1, 0.25)) : null
    return group([extra, head], { opacity: seg(p, 0, 0.08), transform: { scale: lerp(0.7, 1, k) } })
  }
}

/** Head in pressed state; t = seconds since hold start. */
function holdPress(long: boolean) {
  return (t: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const k = outCubic(seg(t, 0, tokens.time.holdPress))
    const extra = long ? brackets(R, 1 + k * 0.1, ctx, 1) : null
    return group([extra, group([holdHead(ctx, long, 1, 1 - k)], { transform: { scale: lerp(1, PRESSED, k) } })])
  }
}

/** While held: the centre glyph keeps contracting toward the centre (2 copies, half a period apart). */
function holdLoop(long: boolean) {
  return (t: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const P = tokens.time.holdLoop
    const u = (((t % P) + P) % P) / P
    const gw = ctx.unit * tokens.stroke.hair * 1.6
    const from = R * PRESSED * (long ? INNER_RING * 0.8 : INNER_RING) - gw
    const shapes: SceneNode[] = []
    for (let i = 0; i < 2; i++) {
      const v = (u + i / 2) % 1
      const r = lerp(from, from * 0.12, inQuad(v))
      shapes.push(glyphShape(long, r, gw * lerp(1, 0.6, v), ctx.palette.ring, seg(v, 0, 0.15) * (1 - seg(v, 0.75, 1))))
    }
    return group(shapes)
  }
}

function holdProgress(_long: boolean) {
  return (p: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const W = ctx.unit * 0.083
    const r = R * PROGRESS_R
    const lead = Math.min(1, p * 4 / 3)
    const done = Math.min(1, p)
    return group([
      ring(r, W, ctx.palette.track, 0.9),
      lead > 0 ? arc(r, 0, TAU * lead, W, ctx.palette.ring) : null,
      done > 0 ? arc(r, 0, TAU * done, W, ctx.palette.fill) : null,
    ].filter(Boolean) as SceneNode[])
  }
}

function makeHold(long: boolean): NoteDesign {
  return {
    kind: long ? 'long-hold' : 'hold',
    enter: {
      id: 'enter',
      mode: 'normalized',
      duration: tokens.time.enter,
      draw: holdEnter(long),
      note: long
        ? 'Steady fast (no timing to read). Double ring (hairline inner) + square glyph + corner brackets.'
        : 'Steady fast (no timing to read). Double ring (hairline inner) + circle glyph.',
    },
    hold: {
      press: { id: 'hold-press', mode: 'once', duration: tokens.time.holdPress, draw: holdPress(long), note: 'Head sinks to 0.86, centre glyph folds away.' },
      loop: { id: 'hold-loop', mode: 'loop', duration: tokens.time.holdLoop, draw: holdLoop(long), note: 'Centre glyph keeps contracting inward (2 copies, half a period apart). Drawn above the head. Seamless.' },
      progress: { id: 'hold-progress', mode: 'progress', duration: 1, draw: holdProgress(long), note: 'Cytoid-style progress ring: white lead at 4/3·p, fill at p.' },
    },
    clear: makeClearClips({ shape: 'circle', reach: long ? 1.6 : 1.5, sectors: 24, extra: long ? 'beam' : 'double', seed: long ? 4 : 3 }),
    miss: makeMissClip('circle'),
  }
}

export const hold = makeHold(false)
export const longHold = makeHold(true)
