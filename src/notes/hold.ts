/**
 * HOLD / LONG HOLD — ring + dark-core head + body (the "progress bar").
 *
 * Holds may be pressed early, so the head carries **no timing gauge**: it
 * reaches a steady pose quickly and reads as a different *shape* from a
 * click: a borderless dark core (at Cytoid HoldNoteRing's inner-ring radius)
 * with a static centre glyph — a circle (hold) or a square (long hold, +
 * corner brackets).
 *
 * Entry mirrors the click depth language: the head spawns as one deep ball
 * (depth 2), then the core sinks 2 → 1 while contracting onto the inner ring
 * as the background rises 2 → 3 (fill); the depth-1 end uses click's
 * DEPTH_CONTRAST-compressed stop. Steady by p ≈ 0.35.
 * No arrows: arrows would suggest dragging.
 *
 * Holding is split into independent layers (frame-friendly), composed as
 * press → loop → progress (bottom to top):
 *   press    (once, 0.2 s)   head sinks to 0.86 scale (glyph stays)
 *   loop     (loop, 0.6 s)   dark-core ping inside + two outer ripples (seamless)
 *   progress (progress 0–1)  Cytoid-style progress ring: white lead (4/3·p) + fill (p)
 * Bodies (see ./bodies.ts) are stretched elements, not frame clips.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { inOutCubic, inOutQuad, lerp, outBack, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { compressedStops, depthSplit, ringWidth } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { arc, assemblingRing, disk, ring } from './parts'

const PRESSED = 0.86
/** Cytoid ProgressRing: outer radius ≈ 1.42 R, thickness ≈ 0.083 u */
const PROGRESS_R = 1.34

/**
 * Centre glyph: circle (hold) or square (long hold), outline only. `r` = circle
 * radius; the square is drawn smaller (half-size 0.82·r) so both read as the
 * same visual area.
 */
function glyphShape(long: boolean, r: number, width: number, color: string, opacity = 1): SceneNode {
  const s = r * 0.82
  return long
    ? { type: 'rect', x: -s, y: -s, w: s * 2, h: s * 2, stroke: color, strokeWidth: width, join: 'miter', opacity }
    : ring(r, width, color, opacity)
}

const INNER_RING = 0.55
const GLYPH = 0.2

/**
 * Head; `k` = build progress 0..1 (fast), `glyph` = centre glyph reveal,
 * `split` = depth split 0..1 (steady poses use the default 1).
 */
function holdHead(ctx: DrawContext, long: boolean, k: number, glyph: number, split = 1): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const inner = R - W
  // dark core at Cytoid HoldNoteRing's inner-ring radius — no border
  const innerRingR = R * INNER_RING
  const gw = ctx.unit * tokens.stroke.hair * 1.6
  // depth-2 split (click's ramp, roles mirrored): the ball rises to fill, the
  // core sinks to the compressed track stop while contracting onto the inner ring
  const { d1 } = compressedStops(ctx)
  const { up, down } = depthSplit(split, ctx.palette.fill, ctx.palette.deep, d1)
  return group([
    // solid ball from the first frame
    disk(inner + 0.5, up),
    disk(lerp(inner + 0.5, innerRingR, split), down),
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
    // split starts after the fade-in (0.08) and lands with the steady pose (0.35)
    const split = inOutQuad(seg(p, 0.08, 0.35))
    const head = holdHead(ctx, long, k, glyph, split)
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

/**
 * While held:
 *  - inside: the dark core itself pings (Tailwind `animate-ping`): a copy of
 *    the core disc scales 1 → 2 and fades out over the first 75 % of each
 *    half period — the same rate as the outer ripples — ease ≈
 *    cubic-bezier(0, 0, 0.2, 1). The glyph stays still on top.
 *  - outside: two thin ripples, half a period apart, beyond the progress ring.
 * Both are seamless over `holdLoop`.
 */
function holdLoop(long: boolean) {
  return (t: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const hair = ctx.unit * tokens.stroke.hair
    const P = tokens.time.holdLoop
    const u = (((t % P) + P) % P) / P
    // one ping per ripple: two per period, in phase with the outer ripples
    const w = (u * 2) % 1
    const k = outCubic(seg(w, 0, 0.75))
    const coreR = R * PRESSED * INNER_RING
    // copy of the core disc — same DEPTH_CONTRAST-compressed track stop
    const coreColour = compressedStops(ctx).d1
    // clipped to the head interior so the ping never dims the white ring
    const innerPressed = (R - ringWidth(ctx)) * PRESSED
    const ping = w < 0.75
      ? group([disk(coreR * lerp(1, 2, k), coreColour, 0.8 * (1 - k))], { clip: { type: 'circle', r: innerPressed } })
      : null
    const glyph = glyphShape(long, R * PRESSED * GLYPH, ctx.unit * tokens.stroke.hair * 1.6 * PRESSED, ctx.palette.ring)
    const ripples: SceneNode[] = []
    for (let i = 0; i < 2; i++) {
      const v = (u + i / 2) % 1
      ripples.push(ring(R * lerp(PROGRESS_R + 0.12, long ? 2.05 : 1.85, outCubic(v)), hair * lerp(2.4, 0.6, v), ctx.palette.light, (1 - v) ** 1.5 * 0.85))
    }
    return group([...ripples, ping, glyph].filter(Boolean) as SceneNode[])
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
        ? 'Steady fast (no timing to read). Deep ball splits: core sinks to track on the inner ring, ball rises to fill; square glyph + corner brackets.'
        : 'Steady fast (no timing to read). Deep ball splits: core sinks to track on the inner ring, ball rises to fill; circle glyph.',
    },
    hold: {
      press: { id: 'hold-press', mode: 'once', duration: tokens.time.holdPress, draw: holdPress(long), note: 'Head sinks to 0.86; the centre glyph stays.' },
      loop: { id: 'hold-loop', mode: 'loop', duration: tokens.time.holdLoop, draw: holdLoop(long), note: 'The dark core pings (Tailwind-style scale 1→2 + fade) under the still glyph; two outer ripples pulse. Drawn above the head. Seamless.' },
      progress: { id: 'hold-progress', mode: 'progress', duration: 1, draw: holdProgress(long), note: 'Cytoid-style progress ring: white lead at 4/3·p, fill at p.' },
    },
    clear: makeClearClips({ shape: 'circle', reach: long ? 1.6 : 1.5, sectors: 24, extra: long ? 'beam' : 'double', seed: long ? 4 : 3 }),
    miss: makeMissClip('circle'),
  }
}

export const hold = makeHold(false)
export const longHold = makeHold(true)
