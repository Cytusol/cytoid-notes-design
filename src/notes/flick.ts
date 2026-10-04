/**
 * FLICK (1.125) — diamond + two outward chevrons.
 *
 * Enter:
 *  0.00–0.45  diamond outline draws itself (4 edges grow from the vertices), scale 0.6 → 1
 *  0.00–0.94  fill diamond grows ease-in, 0.92–1 blink (same timing language as Click)
 *  0.00–lock  chevrons slide in linearly from far left/right (Cytoid behaviour),
 *             lock = 1 − 0.25 s / enter duration; then they "snap" (small kick)
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { bump, inCubic, lerp, outBack, outCubic, outQuart, seg } from '../core/ease'
import { group, regularPolygon } from '../core/scene'
import { tokens } from '../tokens'
import { CLICK_TIMING, CORE_MAX } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { diamond } from './parts'

/**
 * Normalised time at which the arrows lock. Cytoid: arrows close
 * `min(0.25 s, approach / 2)` before the hit, so this depends on the real
 * approach window (vector) — frames are baked at the nominal 1.2 s.
 */
export function flickLock(approach: number = tokens.time.enter): number {
  if (approach <= 0)
    return 0
  return 1 - Math.min(tokens.time.flickLock, approach / 2) / approach
}
export const FLICK_LOCK = flickLock()

function flickArrow(size: number, width: number, color: string): SceneNode {
  // ">" pointing right
  return { type: 'poly', points: [[-size * 0.32, -size * 0.6], [size * 0.32, 0], [-size * 0.32, size * 0.6]], stroke: color, strokeWidth: width, join: 'miter' }
}

/** Diamond outline drawn edge by edge; k ∈ [0,1]. */
function buildingDiamond(r: number, width: number, color: string, k: number): SceneNode {
  if (k >= 0.999)
    return diamond(r, { stroke: color, strokeWidth: width })
  const pts = regularPolygon(4, r)
  const lines: SceneNode[] = []
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = pts[i]!
    const [x2, y2] = pts[(i + 1) % 4]!
    // each edge grows from its midpoint toward both vertices
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    lines.push({ type: 'line', x1: lerp(mx, x1, k), y1: lerp(my, y1, k), x2: lerp(mx, x2, k), y2: lerp(my, y2, k), stroke: color, strokeWidth: width, cap: 'square' })
  }
  return group(lines)
}

function flickEnter(p: number, ctx: DrawContext): SceneNode {
  const R = ctx.size / 2
  const W = ctx.unit * tokens.stroke.ring
  // diamond vertex radius such that the outline fits the note box
  const rv = R - W * 0.7
  const inner = rv - W * 1.1
  const a = outCubic(seg(p, 0, 0.12))
  const build = outQuart(seg(p, 0, 0.45))
  const scale = lerp(0.6, 1, outCubic(seg(p, 0, 0.55)))

  const lock = flickLock(ctx.approach)
  const m = seg(p, 0, lock)
  const kick = outBack(seg(p, lock, lock + 0.08), 3) - seg(p, lock, lock + 0.08)
  const near = R * 0.98 + W * 0.6
  const far = near + ctx.unit * 0.95
  const x = lerp(far, near, m) + kick * ctx.unit * 0.06
  const arrowSize = R * 0.62
  const arrowOpacity = seg(p, 0.05, 0.25)
  const arrows = group([
    group([flickArrow(arrowSize, W * 0.85, ctx.palette.ring)], { transform: { x } }),
    group([flickArrow(arrowSize, W * 0.85, ctx.palette.ring)], { transform: { x: -x, rotate: Math.PI } }),
  ], { opacity: arrowOpacity })

  // same timing language as Click: ease-in core + blink right before the hit
  const g = lerp(0.16, 1, inCubic(seg(p, 0.08, CLICK_TIMING.coreFull))) * seg(p, 0.02, 0.12)
  const blink = bump(p, CLICK_TIMING.blinkFrom, 1)
  const body = group([
    diamond(inner + W * 0.15, { fill: ctx.palette.fill }),
    diamond(inner * CORE_MAX * g, { fill: ctx.palette.core }),
    blink > 0 ? diamond(inner * CORE_MAX * g, { fill: ctx.palette.ring, opacity: 0.75 * blink }) : null,
    // centre slit: flat nod to Cytoid's split-diamond flick fill
    { type: 'line', x1: 0, y1: -inner * 0.5 * g, x2: 0, y2: inner * 0.5 * g, stroke: ctx.palette.deep, strokeWidth: W * 0.5, opacity: seg(p, 0.5, 0.8) },
    buildingDiamond(rv, lerp(W * 0.45, W, build) * (1 + 0.25 * blink), ctx.palette.ring, build),
  ].filter(Boolean) as SceneNode[], { transform: { scale } })

  return group([arrows, body], { opacity: a })
}

export const flick: NoteDesign = {
  kind: 'flick',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    draw: flickEnter,
    note: 'Diamond outline grows from edge midpoints, core grows ease-in with a blink before the hit (as Click), chevrons converge linearly and lock 0.25 s early.',
  },
  clear: makeClearClips({ shape: 'diamond', reach: 1.4, sectors: 4, extra: 'streaks', seed: 2 }),
  miss: makeMissClip('diamond'),
}
