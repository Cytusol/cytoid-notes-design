/**
 * FLICK (1.125) — diamond + two outward chevrons.
 *
 * Enter:
 *  0.00–0.45  diamond outline draws itself (4 edges grow from the vertices)
 *  0.25–0.94  shade split + late (ease-in) core, as Click; 0.86–0.89 + 0.92–1 double blink
 *  0.00–0.45  chevrons slide in ease-out and settle
 *  0.70–1.00  a fainter approach chevron pair converges linearly onto them (Click's approach ring)
 *  0.00–1.00  the diamond body plays Click's fitted S-curve (`tokens.sizeCurve.click` —
 *             after Cytus II's flick, whose own curve shrinks and swaps to a
 *             larger white hit diamond on the final frame)
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext, NoteDesign } from './types'
import { lerp, outCubic, outQuart, seg } from '../core/ease'
import { group, regularPolygon } from '../core/scene'
import { tokens } from '../tokens'
import { blinkAmount, CLICK_TIMING, clickSize, CORE_MAX, coreGrowth, splitShades } from './click'
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

  const near = R * 0.98 + W * 0.6
  const far = near + ctx.unit * 0.95
  const x = lerp(far, near, outCubic(seg(p, 0, ARROW_SETTLE)))
  const arrowSize = R * 0.62
  const arrowOpacity = outCubic(seg(p, 0, 0.3))
  const pair = (px: number, width: number) => [
    group([flickArrow(arrowSize, width, ctx.palette.ring)], { transform: { x: px } }),
    group([flickArrow(arrowSize, width, ctx.palette.ring)], { transform: { x: -px, rotate: Math.PI } }),
  ]
  const arrows = group(pair(x, W * 0.85), { opacity: arrowOpacity })
  // approach chevrons (Cytus II's second chevron pair): the flick's approach
  // ring — converge linearly onto the settled pair over the last 30 %
  const ap = seg(p, CLICK_TIMING.approachFrom, 1)
  const approach = ap > 0 && ap < 1
    ? group(pair(lerp(near + ctx.unit * 0.35, near, ap), W * 0.6), { opacity: 0.5 * seg(ap, 0, 0.15) })
    : null

  // same timing language as Click: dim pre-roll, the core swells late
  const g = coreGrowth(p)
  const blink = blinkAmount(p)
  const split = splitShades(p, ctx)
  const body = group([
    diamond(inner + W * 0.15, { fill: split.base }),
    // fades in with the shade split (same stacking artifact as the click core otherwise)
    split.k > 0 ? diamond(inner * CORE_MAX * g, { fill: split.core, opacity: split.k }) : null,
    blink > 0 ? diamond(inner * CORE_MAX * g, { fill: ctx.palette.ring, opacity: 0.6 * blink }) : null,
    // centre slit: flat nod to Cytoid's split-diamond flick fill
    { type: 'line', x1: 0, y1: -inner * 0.5 * g, x2: 0, y2: inner * 0.5 * g, stroke: ctx.palette[600], strokeWidth: W * 0.5, opacity: outCubic(seg(p, CLICK_TIMING.splitFrom, 0.75)) },
    buildingDiamond(rv, lerp(W * 0.45, W, build) * (1 + 0.25 * blink), ctx.palette.ring, build),
  ].filter(Boolean) as SceneNode[], { transform: { scale: clickSize(p) } })

  return group([approach, arrows, body].filter(Boolean) as SceneNode[], { opacity: a })
}

export const flick: NoteDesign = {
  kind: 'flick',
  enter: {
    id: 'enter',
    mode: 'normalized',
    duration: tokens.time.enter,
    draw: flickEnter,
    note: 'Diamond outline grows from edge midpoints; dim pre-roll and late core with a double blink (as Click) on Click\'s fitted size curve; chevrons settle by p = 0.45, a fainter approach pair converges onto them over the last 30 %.',
  },
  clear: makeClearClips({ shape: 'diamond', reach: 1.4, sectors: 4, extra: 'streaks', seed: 2 }),
  miss: makeMissClip('diamond'),
}
