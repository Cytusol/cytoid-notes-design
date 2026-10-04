/**
 * DRAG family. Players follow the *path*, not the tap timing, so drag heads
 * and children reach their steady pose almost immediately (p ≈ 0.2) and then
 * stay still — no gauge, no late motion.
 *
 * Drag head (0.8): white ring + full fill + white node dot.
 * Drag child (0.65): no ring — solid bead with a white node dot.
 * Click drag head: identical to Click (see click.ts) — it starts a chain.
 * Click drag child: drag child silhouette in the click colours + a dashed
 *   white 4-arc halo, distinguishable from both drag child and drag head.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { lerp, outBack, outCubic, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { ringWidth } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { assemblingRing, disk } from './parts'

/** steady by this p */
const STEADY = 0.2

function headDraw(p: number, ctx: DrawContext): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const k = outCubic(seg(p, 0, STEADY))
  return group([
    disk(R - W + 0.5, ctx.palette.fill),
    disk((R - W) * 0.36 * outBack(seg(p, STEADY * 0.4, STEADY), 2.2), ctx.palette.ring),
    assemblingRing(R - W / 2, W, ctx.palette.ring, 2, k, lerp(-TAU / 4, 0, k)),
  ], { opacity: seg(p, 0, 0.06), transform: { scale: lerp(0.6, 1, k) } })
}

export const dragHead: NoteDesign = {
  kind: 'drag-head',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    note: 'Pops in and is steady by p = 0.2: ring closes from 2 halves, node dot. Path matters, not timing.',
    draw: headDraw,
  },
  clear: makeClearClips({ shape: 'circle', reach: 1.4, sectors: 24, seed: 5 }),
  miss: makeMissClip('circle'),
}

function childDraw(halo: boolean) {
  return (p: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const hair = ctx.unit * tokens.stroke.hair
    const k = outCubic(seg(p, 0, STEADY))
    return group([
      // dashed halo keeps its gaps (duty 0.72) — never reads as a drag-head ring
      halo ? assemblingRing(R + hair * 3, hair * 1.7, ctx.palette.ring, 4, k * 0.72, lerp(TAU / 8 - TAU / 4, TAU / 8, k)) : null,
      disk(R, ctx.palette.fill),
      disk(R * 0.36 * outBack(seg(p, STEADY * 0.4, STEADY), 2.2), ctx.palette.ring),
    ].filter(Boolean) as SceneNode[], { opacity: seg(p, 0, 0.06), transform: { scale: lerp(0.5, 1, k) } })
  }
}

export const dragChild: NoteDesign = {
  kind: 'drag-child',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: childDraw(false), note: 'Solid bead, steady by p = 0.2.' },
  clear: makeClearClips({ shape: 'circle', reach: 1.4, sectors: 24, seed: 6 }),
  miss: makeMissClip('circle'),
}

export const clickDragChild: NoteDesign = {
  kind: 'click-drag-child',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: childDraw(true), note: 'Bead in click colours + dashed 4-arc halo, steady by p = 0.2.' },
  clear: makeClearClips({ shape: 'circle', reach: 1.4, sectors: 24, seed: 7 }),
  miss: makeMissClip('circle'),
}
