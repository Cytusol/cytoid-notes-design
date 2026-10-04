/**
 * DRAG family. Players follow the *path*, not the tap timing, so drag heads
 * and children reach their steady pose almost immediately (p = 0.2) and then
 * stay still — no gauge, no late motion.
 *
 * Drag head (0.8): white ring + full fill + white arrow pointing along the
 *   chain (`ctx.heading`; frames are baked pointing up — rotate the sprite).
 * Drag child (0.65): solid bead, like Cytoid. Only a faint deep hairline ring.
 * Click drag head: Click timing + the same arrow (see click.ts).
 * Click drag child: identical to drag child, click colours.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { lerp, outCubic, seg, TAU } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { dragArrow, ringWidth } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { assemblingRing, disk, ring } from './parts'

/** steady by this p */
const STEADY = 0.2

function headDraw(p: number, ctx: DrawContext): SceneNode {
  const R = ctx.size / 2
  const W = ringWidth(ctx)
  const k = outCubic(seg(p, 0, STEADY))
  return group([
    disk(R - W + 0.5, ctx.palette.fill),
    dragArrow(ctx, (R - W) * 0.95, outCubic(seg(p, STEADY * 0.3, STEADY))),
    assemblingRing(R - W / 2, W, ctx.palette.ring, 2, k, lerp(-TAU / 4, 0, k)),
  ].filter(Boolean) as SceneNode[], { opacity: seg(p, 0, 0.06), transform: { scale: lerp(0.6, 1, k) } })
}

export const dragHead: NoteDesign = {
  kind: 'drag-head',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    note: 'Steady by p = 0.2: ring closes from 2 halves, white arrow along the chain (rotate by heading). Path matters, not timing.',
    draw: headDraw,
  },
  clear: makeClearClips({ shape: 'circle', reach: 1.4, sectors: 24, seed: 5 }),
  miss: makeMissClip('circle'),
}

/**
 * Solid bead — like Cytoid's drag child. The only inner decoration is a
 * low-contrast `deep` hairline ring, so the centre never draws the eye and
 * the node position stays crisp.
 */
function childDraw(p: number, ctx: DrawContext): SceneNode {
  const R = ctx.size / 2
  const k = outCubic(seg(p, 0, STEADY))
  return group([
    disk(R, ctx.palette.fill),
    ring(R * 0.62, ctx.unit * tokens.stroke.hair, ctx.palette.deep, 0.7 * k),
  ], { opacity: seg(p, 0, 0.06), transform: { scale: lerp(0.5, 1, k) } })
}

export const dragChild: NoteDesign = {
  kind: 'drag-child',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: childDraw, note: 'Solid bead (Cytoid), faint deep hairline ring, steady by p = 0.2.' },
  clear: makeClearClips({ shape: 'circle', reach: 1.4, sectors: 24, seed: 6 }),
  miss: makeMissClip('circle'),
}

export const clickDragChild: NoteDesign = {
  kind: 'click-drag-child',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: childDraw, note: 'Same as drag child, click colours.' },
  clear: makeClearClips({ shape: 'circle', reach: 1.4, sectors: 24, seed: 7 }),
  miss: makeMissClip('circle'),
}
