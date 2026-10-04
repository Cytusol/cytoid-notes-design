/**
 * CLICK (and Click drag head) — circle. White ring + layered timing gauge.
 *
 * The interior *is* the timer. Several concentric edges grow together and
 * linearly with p, so the eye reads a clear, constant-speed motion:
 *   fill disc  r = inner·p            (Cytoid's timing cue, kept linear)
 *   white rim  on the fill edge       (high-contrast moving edge; meets the ring at p = 1)
 *   deep band  at 0.58·r              (second, slower edge → stronger sense of speed)
 *   white core dot                    (anchors the centre, appears early)
 *
 * Enter (normalised p, ends at the hit):
 *  0.00–0.10  fade in
 *  0.00–0.50  note scales 0.62 → 1 (Cytoid initial_scale behaviour)
 *  0.00–0.40  ring assembles from 3 arcs while spinning into place
 *  0.60–0.92  four faint lock-on ticks settle onto the ring, then vanish
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { inOutCubic, lerp, outBack, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { makeClearClips, makeMissClip } from './effects'
import { assemblingRing, disk, ring, tick } from './parts'

/** Ring stroke for a note of this size (thinner on small notes). */
export function ringWidth(ctx: DrawContext) {
  return ctx.unit * tokens.stroke.ring * (ctx.size / ctx.unit) ** 0.5
}

/** The layered gauge; `g` = gauge progress 0..1 (fill radius = inner·g). */
export function timingGauge(g: number, inner: number, ctx: DrawContext, opacity = 1): SceneNode {
  const r = inner * g
  const hair = ctx.unit * tokens.stroke.hair
  return group([
    disk(inner + 0.5, ctx.palette.track, 0.6),
    disk(r, ctx.palette.fill),
    ring(r * 0.58, hair * 2.2, ctx.palette.deep, seg(g, 0.12, 0.3)),
    ring(Math.max(0, r - hair * 0.7), hair * 1.4, ctx.palette.ring, seg(g, 0.15, 0.35)),
    disk(ctx.unit * 0.07 * outBack(seg(g, 0.05, 0.25), 2), ctx.palette.ring),
  ], { opacity })
}

export function clickEnter(p: number, ctx: DrawContext): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const rc = R - W / 2
  const inner = R - W
  const a = outCubic(seg(p, 0, 0.1))
  const build = outQuart(seg(p, 0, 0.4))
  const scale = lerp(0.62, 1, outCubic(seg(p, 0, 0.5)))

  const children: SceneNode[] = [
    timingGauge(p, inner, ctx),
    assemblingRing(rc, lerp(W * 0.45, W, build), ctx.palette.ring, 3, build, lerp(-TAU / 6, 0, build)),
  ]
  // faint lock-on ticks: peripheral hint only, must not compete with the chart
  const k = inOutCubic(seg(p, 0.6, 0.92))
  const op = 0.45 * seg(p, 0.6, 0.7) * (1 - seg(p, 0.84, 0.94))
  const r0 = lerp(R * 1.3, R * 1.04, k)
  for (let i = 0; i < 4; i++)
    children.push(tick(i * (TAU / 4), r0, r0 + R * 0.12, W * 0.35, ctx.palette.ring, op))

  return group(children, { opacity: a, transform: { scale } })
}

export const click: NoteDesign = {
  kind: 'click',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    draw: clickEnter,
    note: 'Layered timing gauge (fill + white rim + deep band + core) grows linearly and meets the ring at the hit; ring assembles from 3 arcs; faint lock-on ticks.',
  },
  clear: makeClearClips({ shape: 'circle', reach: 1.45, sectors: 24, seed: 1 }),
  miss: makeMissClip('circle'),
}
