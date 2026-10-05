/**
 * FLICK (1.125) — diamond + two outward chevrons.
 *
 * Enter:
 *  0.00–0.45  diamond outline draws itself (4 edges grow from the vertices), scale 0.6 → 1
 *  0.00–0.94  fill diamond grows ease-out (settles early, as Click), 0.86–0.89 + 0.92–1 double blink
 *  0.00–0.45  chevrons slide in ease-out and settle; no lock/kick — the note carries
 *             no timing cues, the scan line does
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { lerp, outCubic, outQuart, seg } from '../core/ease'
import { group, regularPolygon } from '../core/scene'
import { tokens } from '../tokens'
import { blinkAmount, CLICK_TIMING, CORE_MAX, depthColors } from './click'
import { makeClearClips, makeMissClip } from './effects'
import { diamond, flickChevron } from './parts'

/** Normalised p at which the side arrows reach their steady position. */
const ARROW_SETTLE = 0.45

function flickArrow(size: number, width: number, color: string): SceneNode {
  // ">" pointing right, 90° like the diamond corner
  return flickChevron(size * 0.3, size * 0.6, width, color)
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

  const near = R * 0.98 + W * 0.6
  const far = near + ctx.unit * 0.95
  // arrows slide in ease-out and settle early — no lock/kick: the note carries
  // no timing cues, players read the scan line
  const x = lerp(far, near, outCubic(seg(p, 0, ARROW_SETTLE)))
  const arrowSize = R * 0.62
  const arrowOpacity = outCubic(seg(p, 0, 0.3))
  const arrows = group([
    group([flickArrow(arrowSize, W * 0.85, ctx.palette.ring)], { transform: { x } }),
    group([flickArrow(arrowSize, W * 0.85, ctx.palette.ring)], { transform: { x: -x, rotate: Math.PI } }),
  ], { opacity: arrowOpacity })

  // same timing language as Click: ease-out core from p = 0, settled before the hit
  const g = lerp(0.16, 1, outCubic(seg(p, 0, CLICK_TIMING.coreFull))) * seg(p, 0, 0.12)
  const blink = blinkAmount(p)
  const depth = depthColors(p, ctx)
  const body = group([
    diamond(inner + W * 0.15, { fill: depth.base }),
    // fades in with the depth split (same stacking artifact as the click core otherwise)
    diamond(inner * CORE_MAX * g, { fill: depth.core, opacity: depth.k }),
    blink > 0 ? diamond(inner * CORE_MAX * g, { fill: ctx.palette.ring, opacity: 0.6 * blink }) : null,
    // centre slit: flat nod to Cytoid's split-diamond flick fill
    { type: 'line', x1: 0, y1: -inner * 0.5 * g, x2: 0, y2: inner * 0.5 * g, stroke: ctx.palette.deep, strokeWidth: W * 0.5, opacity: outCubic(seg(p, 0.05, 0.45)) },
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
    note: 'Diamond outline grows from edge midpoints, core grows ease-out and settles early with a double blink (as Click), chevrons slide in ease-out and settle by p = 0.45.',
  },
  clear: makeClearClips({ shape: 'diamond', reach: 1.4, sectors: 4, extra: 'streaks', seed: 2 }),
  miss: makeMissClip('diamond'),
}
