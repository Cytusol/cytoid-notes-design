/**
 * DRAG family.
 *
 * Drag head (0.8): white ring + full fill + white "node" dot. Fill does not
 *   act as a gauge (Cytoid suppresses it for drag heads) — the ring and the
 *   node dot carry the timing instead.
 * Drag child (0.65): no ring — solid fill disc with a white node dot.
 *   Reads as a bead on the chain.
 * Click drag head: identical to Click (see click.ts) — it starts a chain.
 * Click drag child: drag child silhouette, own colour family + a dashed white
 *   4-arc halo so it is also distinguishable without colour.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { lerp, outBack, outCubic, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { circleHead } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { assemblingRing, disk } from './parts'

function nodeDot(p: number, ctx: DrawContext, R: number): SceneNode {
  const k = outBack(seg(p, 0.6, 0.9), 2.2)
  return disk(R * 0.3 * k, ctx.palette.ring)
}

export const dragHead: NoteDesign = {
  kind: 'drag-head',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    note: 'Ring closes from 2 halves while the full fill settles; white node dot pops in at the end.',
    draw: (p, ctx) => circleHead(p, ctx, {
      growFill: false,
      arcs: 2,
      ticks: false,
      from: 0.5,
      glyph: (pp, c, inner) => nodeDot(pp, c, inner),
    }),
  },
  clear: makeClearClips({ shape: 'circle', reach: 1.75, sectors: 24, seed: 5 }),
  miss: makeMissClip('circle'),
}

function childDraw(halo: boolean) {
  return (p: number, ctx: DrawContext): SceneNode => {
    const R = ctx.size / 2
    const a = outCubic(seg(p, 0, 0.15))
    const scale = lerp(0.5, 1, outCubic(seg(p, 0, 0.6)))
    const hair = ctx.unit * tokens.stroke.hair
    const build = outCubic(seg(p, 0.2, 0.75))
    return group([
      // dashed halo keeps its gaps (duty 0.72) — never reads as a drag-head ring
      halo ? assemblingRing(R + hair * 3, hair * 1.7, ctx.palette.ring, 4, build * 0.72, lerp(TAU / 8 - TAU / 4, TAU / 8, build)) : null,
      disk(R, ctx.palette.fill),
      disk(R * 0.36 * outBack(seg(p, 0.55, 0.85), 2.2), ctx.palette.ring),
    ].filter(Boolean) as SceneNode[], { opacity: a, transform: { scale } })
  }
}

export const dragChild: NoteDesign = {
  kind: 'drag-child',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: childDraw(false), note: 'Solid bead scales in, node dot pops.' },
  clear: makeClearClips({ shape: 'circle', reach: 1.7, sectors: 24, seed: 6 }),
  miss: makeMissClip('circle'),
}

export const clickDragChild: NoteDesign = {
  kind: 'click-drag-child',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: childDraw(true), note: 'Drag child + dashed 4-arc halo (gaps stay open); own colour family.' },
  clear: makeClearClips({ shape: 'circle', reach: 1.7, sectors: 24, seed: 7 }),
  miss: makeMissClip('circle'),
}
