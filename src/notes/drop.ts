/**
 * DROP notes — horizontal capsules (falling-note mode). The fall offset is
 * applied by the consumer (position), so the clip only handles appearance:
 *
 * Drop click: white outline + fill + white core bar. At landing the core
 *   bar widens (lock cue).
 * Drop drag: shorter, outline + fill, no core; two notches mark it as a drag.
 *   Drop drags are never connected.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { lerp, outCubic, outQuart, seg } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'
import { makeClearClips, makeMissClip } from './effects'
import { capsule } from './parts'

export const DROP_ASPECT = { w: 1.15, h: 0.3 }

function dropEnter(core: boolean) {
  return (p: number, ctx: DrawContext): SceneNode => {
    const w = ctx.size * DROP_ASPECT.w
    const h = ctx.size * DROP_ASPECT.h
    const W = h * 0.2
    const a = outCubic(seg(p, 0, 0.12))
    const build = outQuart(seg(p, 0, 0.35))
    const sx = lerp(0.35, 1, build)
    const items: (SceneNode | null)[] = [
      capsule(w - W, h - W, { fill: ctx.palette.fill }),
      capsule(w - W / 2, h - W / 2, { stroke: ctx.palette.ring, strokeWidth: W }),
    ]
    if (core) {
      const k = outCubic(seg(p, 0.82, 1))
      const cw = w * lerp(0.28, 0.5, k)
      items.push(capsule(cw, h * 0.26, { fill: ctx.palette.ring }))
    }
    else {
      const nh = h * 0.42
      for (const s of [-1, 1]) {
        const x = s * w * 0.16
        items.push({ type: 'line', x1: x, y1: -nh / 2, x2: x, y2: nh / 2, stroke: ctx.palette.deep, strokeWidth: W * 0.9, cap: 'round', opacity: seg(p, 0.3, 0.6) })
      }
    }
    return group(items, { opacity: a, transform: { scaleX: sx } })
  }
}

export const dropClick: NoteDesign = {
  kind: 'drop-click',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: dropEnter(true), note: 'Capsule stretches open horizontally; white core widens on landing.' },
  clear: makeClearClips({ shape: 'capsule', reach: 1.6, sectors: 24, seed: 8 }),
  miss: makeMissClip('capsule'),
}

export const dropDrag: NoteDesign = {
  kind: 'drop-drag',
  enter: { id: 'enter', mode: 'normalized', duration: tokens.time.enter, draw: dropEnter(false), note: 'Shorter capsule, two notches instead of a core.' },
  clear: makeClearClips({ shape: 'capsule', reach: 1.5, sectors: 24, seed: 9 }),
  miss: makeMissClip('capsule'),
}
