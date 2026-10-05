/**
 * Stretched elements: hold body, long-hold body, drag connection line.
 * These depend on chart geometry, so they are parametric vector parts.
 * For frame consumers they are baked as tileable strips (see bake).
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext } from './types'
import { clamp01, lerp, outCubic, seg } from '../core/ease'
import { group } from '../core/scene'
import { tokens } from '../tokens'

export interface HoldBodyOptions {
  /** body length in px (from note centre to hold end) */
  length: number
  /** hold progress 0–1 */
  progress: number
  /** seconds — scrolls the centre dashes while holding */
  t?: number
  /** fade-in of the body (follows the head entrance) */
  appear?: number
}

/** Integer dash period of the hold body conveyor (= tile height of the baked strip). */
export function holdDashPeriod(ctx: DrawContext): number {
  return Math.max(2, Math.round(ctx.unit * tokens.stroke.holdBody * 1.1))
}

/** Hold body in note-local space. Extends toward -y for `up`, +y for `down`. */
export function holdBody(o: HoldBodyOptions, ctx: DrawContext): SceneNode {
  const s = ctx.bodyDirection === 'up' ? -1 : 1
  const Wb = ctx.unit * tokens.stroke.holdBody
  const hair = ctx.unit * tokens.stroke.hair
  const L = Math.max(0, o.length)
  const appear = clamp01(o.appear ?? 1)
  // body unrolls from the head once the head is mostly built (hidden under it before)
  const unroll = outCubic(seg(appear, 0.3, 0.9))
  const shown = L * unroll
  const done = L * clamp01(o.progress)
  const dash = holdDashPeriod(ctx) / 2
  const items: SceneNode[] = [
    // track
    { type: 'rect', x: -Wb / 2, y: s > 0 ? 0 : -shown, w: Wb, h: shown, fill: ctx.palette.track, opacity: 0.92 },
  ]
  // centre conveyor dashes (scroll toward the head while holding)
  if (shown > done) {
    items.push({ type: 'line', x1: 0, y1: s * shown, x2: 0, y2: s * done, stroke: ctx.palette.fill, strokeWidth: hair * 2.4, dash: [dash, dash], dashOffset: (o.t ?? 0) * Wb * 4, opacity: 0.75 })
  }
  if (done > 0) {
    items.push(
      { type: 'rect', x: -Wb / 2, y: s > 0 ? 0 : -done, w: Wb, h: done, fill: ctx.palette.fill },
      { type: 'line', x1: 0, y1: 0, x2: 0, y2: s * done, stroke: ctx.palette.ring, strokeWidth: hair * 2, cap: 'butt' },
    )
  }
  // end cap: a small white bar across the end
  if (unroll >= 1) {
    items.push({ type: 'rect', x: -Wb * 0.85, y: s * L - hair * 1.6, w: Wb * 1.7, h: hair * 3.2, fill: ctx.palette.ring })
  }
  return group(items, { opacity: seg(appear, 0.3, 0.45) })
}

export interface LongHoldBodyOptions {
  /** distance from note centre to the top of the play area */
  top: number
  /** distance from note centre to the bottom of the play area */
  bottom: number
  progress: number
  appear?: number
}

/**
 * Long hold body: full-height rail through the note, fills toward both edges.
 *
 * Final-stage collapse (Cytus II LongHold_Line): during the last stretch of the
 * hold the whole pillar — track, rails and done fill — narrows from left and
 * right toward its centre, eased in, down to `LONG_HOLD_SHRINK_CORE`× width.
 * Progress-keyed (not wall-time), so the collapse speed scales with hold length.
 */
const LONG_HOLD_SHRINK_FROM = 0.86
const LONG_HOLD_SHRINK_CORE = 0.15
const LONG_HOLD_SHRINK_EASE = outCubic

export function longHoldBody(o: LongHoldBodyOptions, ctx: DrawContext): SceneNode {
  const WbFull = ctx.unit * tokens.stroke.holdBody
  const hair = ctx.unit * tokens.stroke.hair
  const appear = clamp01(o.appear ?? 1)
  const a = outCubic(seg(appear, 0.3, 0.9))
  const top = o.top * a
  const bottom = o.bottom * a
  const p = clamp01(o.progress)
  const shrink = LONG_HOLD_SHRINK_EASE(seg(p, LONG_HOLD_SHRINK_FROM, 1))
  const Wb = WbFull * (1 - (1 - LONG_HOLD_SHRINK_CORE) * shrink)
  const rail = (x: number): SceneNode => ({ type: 'line', x1: x, y1: -top, x2: x, y2: bottom, stroke: ctx.palette.fill, strokeWidth: hair * 1.6, opacity: 0.9 })
  const items: SceneNode[] = [
    { type: 'rect', x: -Wb / 2, y: -top, w: Wb, h: top + bottom, fill: ctx.palette.track, opacity: 0.55 },
    rail(-Wb / 2),
    rail(Wb / 2),
  ]
  if (p > 0) {
    const w = lerp(Wb * 0.6, Wb, Math.min(1, p * 4))
    items.push({ type: 'rect', x: -w / 2, y: -top * p, w, h: (top + bottom) * p, fill: ctx.palette.fill })
  }
  return group(items, { opacity: seg(appear, 0.3, 0.45) })
}

export interface DragLineOptions {
  x1: number
  y1: number
  x2: number
  y2: number
  /** leading edge 0–1 (line grows from source toward destination) */
  lead?: number
  /** trailing edge 0–1 (line retracts as the scanner passes) */
  trail?: number
  opacity?: number
  /** override dash length in px (bakers round it to whole pixels for seamless tiles) */
  dash?: number
}

/**
 * Drag connection between two notes, in world space. Drawn under the notes.
 * Unchanged from Cytoid: white, dashed (50 % duty), same width. The dash
 * pattern is anchored to the source note so it does not crawl while the
 * trailing edge retracts.
 */
export function dragLine(o: DragLineOptions, ctx: DrawContext): SceneNode | null {
  const lead = clamp01(o.lead ?? 1)
  const trail = clamp01(o.trail ?? 0)
  if (lead <= trail)
    return null
  const W = ctx.unit * tokens.stroke.dragLine
  const dash = o.dash ?? ctx.unit * tokens.stroke.dragDash
  const len = Math.hypot(o.x2 - o.x1, o.y2 - o.y1)
  return {
    type: 'line',
    x1: lerp(o.x1, o.x2, trail),
    y1: lerp(o.y1, o.y2, trail),
    x2: lerp(o.x1, o.x2, lead),
    y2: lerp(o.y1, o.y2, lead),
    stroke: ctx.palette.ring,
    strokeWidth: W,
    cap: 'butt',
    dash: [dash, dash],
    dashOffset: trail * len,
    opacity: o.opacity ?? 1,
  }
}
