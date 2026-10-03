/**
 * HOLD / LONG HOLD — circle head + body.
 *
 * Head: click silhouette + a chevron that points along the body (scan
 * direction) + an outer hairline that tells it apart from a click at a glance.
 * Long hold adds four corner brackets ("this one spans the screen").
 *
 * Holding is split into independent layers so frame animations can be
 * composed at runtime exactly like the vector version:
 *   press    (once, 0.2 s)   head sinks to 0.86 scale, chevron folds away
 *   loop     (loop, 0.6 s)   two thin ripples (seamless)
 *   progress (progress 0–1)  white arc fills clockwise around the head
 * Bodies (see ./bodies.ts) are stretched elements, not frame clips.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { inOutCubic, lerp, outBack, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { circleHead } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { arc, chevron, dashedRing, ring } from './parts'

const PRESSED = 0.86

function dirSign(ctx: DrawContext) {
  return ctx.bodyDirection === 'up' ? 1 : -1
}

function holdGlyph(show: number) {
  return (_p: number, ctx: DrawContext, inner: number): SceneNode | null => {
    if (show <= 0)
      return null
    const s = inner * 0.95
    const W = ctx.unit * tokens.stroke.ring * 0.7
    return group([
      chevron(s * 0.62, W, ctx.palette.ring, 1),
    ], {
      opacity: show,
      transform: { y: -s * 0.04 * dirSign(ctx), rotate: ctx.bodyDirection === 'up' ? 0 : Math.PI, scale: lerp(0.4, 1, outBack(show)) },
    })
  }
}

function brackets(R: number, k: number, ctx: DrawContext, opacity: number): SceneNode {
  const W = ctx.unit * tokens.stroke.hair * 2
  const r = lerp(R * 1.75, R * 1.28, k)
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
    const hair = ctx.unit * tokens.stroke.hair
    const show = outCubic(seg(p, 0.55, 0.85))
    const head = circleHead(p, ctx, { glyph: holdGlyph(show), arcs: long ? 4 : 2 })
    // outer hairline: dashed, spinning, closing up to solid
    const k = outQuart(seg(p, 0.1, 0.7))
    const outer = dashedRing(R * lerp(1.45, 1.16, k), hair * 1.6, ctx.palette.fill, long ? 16 : 12, lerp(0.25, 1, k), lerp(TAU / 4, 0, k), outCubic(seg(p, 0.1, 0.3)))
    const extra = long ? brackets(R, inOutCubic(seg(p, 0.35, 0.9)), ctx, seg(p, 0.35, 0.5)) : null
    return group([outer, extra, head])
  }
}

/** Head in pressed state; t = seconds since hold start. */
function holdPress(long: boolean) {
  return (t: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const hair = ctx.unit * tokens.stroke.hair
    const k = outCubic(seg(t, 0, tokens.time.holdPress))
    const head = circleHead(1, ctx, { glyph: holdGlyph(1 - k), ticks: false })
    const outer = ring(R * lerp(1.16, 1.3, k), hair * 1.6, ctx.palette.fill, 1 - k)
    const extra = long ? brackets(R, 1 + k * 0.12, ctx, 1) : null
    return group([outer, extra, group([head], { transform: { scale: lerp(1, PRESSED, k) } })])
  }
}

function holdLoop(long: boolean) {
  return (t: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const hair = ctx.unit * tokens.stroke.hair
    const P = tokens.time.holdLoop
    const u = (((t % P) + P) % P) / P
    // two thin ripples, half a period apart → seamless; nothing else competes with the progress arc
    const ripples: SceneNode[] = []
    for (let i = 0; i < 2; i++) {
      const v = (u + i / 2) % 1
      ripples.push(ring(R * lerp(1.08, long ? 1.85 : 1.6, outCubic(v)), hair * lerp(2.6, 0.6, v), ctx.palette.light, (1 - v) ** 1.5 * 0.9))
    }
    return group(ripples)
  }
}

function holdProgress(_long: boolean) {
  return (p: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const W = ctx.unit * tokens.stroke.progress
    const r = R * PRESSED + W * 0.9
    return group([
      ring(r, W, ctx.palette.track, 0.9),
      p > 0 ? arc(r, 0, TAU * Math.min(1, p), W, ctx.palette.ring, { cap: 'butt' }) : null,
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
        ? 'Click entrance + dashed outer hairline closing in + four corner brackets. Chevron points along the body.'
        : 'Click entrance + dashed outer hairline closing in. Chevron points along the body.',
    },
    hold: {
      press: { id: 'hold-press', mode: 'once', duration: tokens.time.holdPress, draw: holdPress(long), note: 'Head sinks to 0.86, chevron folds away.' },
      loop: { id: 'hold-loop', mode: 'loop', duration: tokens.time.holdLoop, draw: holdLoop(long), note: 'Two thin ripples half a period apart. Seamless loop.' },
      progress: { id: 'hold-progress', mode: 'progress', duration: 1, draw: holdProgress(long), note: 'Progress arc, x = hold progress.' },
    },
    clear: makeClearClips({ shape: 'circle', reach: long ? 2.3 : 2.1, sectors: 24, extra: long ? 'beam' : 'double', seed: long ? 4 : 3 }),
    miss: makeMissClip('circle'),
  }
}

export const hold = makeHold(false)
export const longHold = makeHold(true)
