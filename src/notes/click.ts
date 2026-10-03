/**
 * CLICK — circle. White ring + flat fill disc.
 *
 * Enter (normalised p, ends at the hit):
 *  0.00–0.12  fade in
 *  0.00–0.45  ring assembles from 3 arcs while spinning into place; note scales 0.62 → 1
 *  0.00–1.00  fill disc grows linearly 0 → full  (the timing cue — kept from Cytoid)
 *  0.55–0.95  four lock-on ticks converge onto the ring and vanish — "now"
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { inOutCubic, lerp, outCubic, outQuart, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { makeClearClips, makeMissClip } from './effects'
import { assemblingRing, disk, tick } from './parts'

export interface CircleHeadOptions {
  /** fill grows with p (timing cue). Drag heads keep a full fill. */
  growFill?: boolean
  /** number of arcs the ring assembles from */
  arcs?: number
  ticks?: boolean
  /** extra content drawn on top of the fill (glyphs) */
  glyph?: (p: number, ctx: DrawContext, inner: number) => SceneNode | null
  /** start scale */
  from?: number
}

export function circleHead(p: number, ctx: DrawContext, o: CircleHeadOptions = {}): SceneNode {
  const R = ctx.size / 2
  const W = ctx.unit * tokens.stroke.ring * (ctx.size / ctx.unit) ** 0.5
  const rc = R - W / 2
  const inner = R - W
  const a = outCubic(seg(p, 0, 0.12))
  const build = outQuart(seg(p, 0, 0.45))
  const scale = lerp(o.from ?? 0.62, 1, outCubic(seg(p, 0, 0.55)))

  const fillR = (o.growFill ?? true) ? inner * p : inner * lerp(0.55, 1, outCubic(seg(p, 0.05, 0.5)))

  const children: (SceneNode | null)[] = [
    // dim backing disc so the growing fill reads as a gauge
    disk(inner + W * 0.1, ctx.palette.track, 0.55 * a),
    disk(fillR, ctx.palette.fill),
    o.glyph?.(p, ctx, inner) ?? null,
    assemblingRing(rc, lerp(W * 0.45, W, build), ctx.palette.ring, o.arcs ?? 3, build, lerp(-TAU / 6, 0, build)),
  ]

  if (o.ticks ?? true) {
    const k = inOutCubic(seg(p, 0.55, 0.95))
    const op = seg(p, 0.55, 0.65) * (1 - seg(p, 0.86, 0.97))
    const r0 = lerp(R * 1.55, R * 1.02, k)
    const len = R * 0.22 * (1 - k * 0.5)
    for (let i = 0; i < 4; i++)
      children.push(tick(i * (TAU / 4), r0, r0 + len, W * 0.55, ctx.palette.ring, op))
  }

  return group(children, { opacity: a, transform: { scale } })
}

export const click: NoteDesign = {
  kind: 'click',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    draw: (p, ctx) => circleHead(p, ctx),
    note: 'Ring assembles from 3 arcs, fill grows linearly (timing cue), 4 ticks lock on at the end.',
  },
  clear: makeClearClips({ shape: 'circle', reach: 1.95, sectors: 24, seed: 1 }),
  miss: makeMissClip('circle'),
}
