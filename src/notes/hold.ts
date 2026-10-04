/**
 * HOLD / LONG HOLD — double-ring head + body (the "progress bar").
 *
 * Holds may be pressed early, so the head carries **no timing gauge**: it
 * reaches a steady pose quickly and stays readable as a *different shape*
 * from a click — Cytoid's double ring (thick outer ring + thin inner ring),
 * a two-tone interior and a bold chevron pointing along the body.
 * Long hold: gold, four corner brackets, and a ↕ arrow (the body runs to
 * both screen edges).
 *
 * Holding is split into independent layers (frame-friendly):
 *   press    (once, 0.2 s)   head sinks to 0.86 scale
 *   loop     (loop, 0.6 s)   two thin ripples outside the progress ring (seamless)
 *   progress (progress 0–1)  Cytoid-style progress ring: white lead (4/3·p) + fill (p)
 * Bodies (see ./bodies.ts) are stretched elements, not frame clips.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { inOutCubic, lerp, outBack, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { ringWidth } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { arc, assemblingRing, chevron, disk, ring } from './parts'

const PRESSED = 0.86
/** Cytoid ProgressRing: outer radius ≈ 1.42 R, thickness ≈ 0.083 u */
const PROGRESS_R = 1.34

/** Steady-state head; `k` = build progress 0..1 (fast), `glyph` = chevron reveal. */
function holdHead(ctx: DrawContext, long: boolean, k: number, glyph: number): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const hair = ctx.unit * tokens.stroke.hair
  const inner = R - W
  // Cytoid HoldNoteRing proportions: inner ring centred at ~0.55 R
  const innerRingR = R * 0.55
  const innerRingW = hair * 1.8
  const up = ctx.bodyDirection === 'up'
  const cw = W * 0.55
  // hold: a single chevron along the body; long hold: a double-headed arrow ↕ (body spans the screen)
  let glyphs: SceneNode[]
  if (long) {
    const L = innerRingR * 0.62
    const cs = innerRingR * 0.62
    glyphs = [
      { type: 'line', x1: 0, y1: -L + cw * 0.4, x2: 0, y2: L - cw * 0.4, stroke: ctx.palette.ring, strokeWidth: cw * 0.8 },
      group([chevron(cs, cw, ctx.palette.ring)], { transform: { y: -L + cs * 0.25 } }),
      group([chevron(cs, cw, ctx.palette.ring)], { transform: { y: L - cs * 0.25, rotate: Math.PI } }),
    ]
  }
  else {
    const cs = innerRingR * 0.85
    glyphs = [group([chevron(cs, cw, ctx.palette.ring)], { transform: { y: -cs * 0.06, rotate: up ? 0 : Math.PI } })]
  }
  return group([
    disk(inner + 0.5, ctx.palette.fill, k),
    // two-tone interior: deep core inside the inner ring
    disk(innerRingR * outCubic(k), ctx.palette.deep),
    assemblingRing(innerRingR, innerRingW, ctx.palette.ring, 4, outQuart(seg(k, 0.25, 1)), lerp(TAU / 8, 0, k)),
    group(glyphs, { opacity: seg(glyph, 0, 0.4), transform: { scale: lerp(0.5, 1, outBack(glyph, 2)) } }),
    assemblingRing(R - W / 2, lerp(W * 0.5, W, k), ctx.palette.ring, 2, outQuart(k), lerp(-TAU / 4, 0, k)),
  ])
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
    return group([extra, group([holdHead(ctx, long, 1, 1)], { transform: { scale: lerp(1, PRESSED, k) } })])
  }
}

function holdLoop(long: boolean) {
  return (t: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const hair = ctx.unit * tokens.stroke.hair
    const P = tokens.time.holdLoop
    const u = (((t % P) + P) % P) / P
    // two thin ripples, half a period apart → seamless; they start outside the progress ring
    const ripples: SceneNode[] = []
    for (let i = 0; i < 2; i++) {
      const v = (u + i / 2) % 1
      ripples.push(ring(R * lerp(PROGRESS_R + 0.12, long ? 2.05 : 1.85, outCubic(v)), hair * lerp(2.4, 0.6, v), ctx.palette.light, (1 - v) ** 1.5 * 0.85))
    }
    return group(ripples)
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
        ? 'Steady fast (no timing to read). Double ring + deep core + ↕ arrow + corner brackets.'
        : 'Steady fast (no timing to read). Double ring + deep core + chevron along the body.',
    },
    hold: {
      press: { id: 'hold-press', mode: 'once', duration: tokens.time.holdPress, draw: holdPress(long), note: 'Head sinks to 0.86.' },
      loop: { id: 'hold-loop', mode: 'loop', duration: tokens.time.holdLoop, draw: holdLoop(long), note: 'Two thin ripples outside the progress ring. Seamless loop.' },
      progress: { id: 'hold-progress', mode: 'progress', duration: 1, draw: holdProgress(long), note: 'Cytoid-style progress ring: white lead at 4/3·p, fill at p.' },
    },
    clear: makeClearClips({ shape: 'circle', reach: long ? 1.6 : 1.5, sectors: 24, extra: long ? 'beam' : 'double', seed: long ? 4 : 3 }),
    miss: makeMissClip('circle'),
  }
}

export const hold = makeHold(false)
export const longHold = makeHold(true)
