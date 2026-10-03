/**
 * Cylheim compat targets: same file names and frame numbers as the Cytus II
 * assets Cylheim loads from `src/images/designer` (see
 * `pixi-runtime-note-animation-provider.ts` / `pixi-runtime-judgment-effect-provider.ts`).
 *
 * Cylheim plays a *timeline* of frame numbers (some repeated) at 30 fps. To
 * keep our motion timing exact, each unique frame number is sampled at the
 * moment Cylheim first shows it.
 */
import type { SceneNode } from '../core/scene'
import type { DrawContext } from '../notes/types'
import type { Direction, NoteKind } from '../tokens'
import { designs } from '../notes'
import { tokens } from '../tokens'

export interface CylheimTarget {
  pattern: string
  kind: NoteKind
  direction?: Direction
  /** frame numbers in display order (Cylheim's timeline) */
  timeline: number[]
  /** clip parameter for frame number `f` */
  sample: (f: number, timeline: number[]) => number
  draw: (x: number, ctx: DrawContext) => SceneNode
  note?: string
}

const range = (a: number, b: number, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step)
const twice = (a: number, b: number) => range(a, b).flatMap(f => [f, f])

/** enter: normalised p at the first display slot of `f` (window ends at hit). */
const enterAt = (f: number, tl: number[]) => (tl.indexOf(f) + 1) / tl.length
/** effects: spread the clip over the frame range */
function spread(duration: number) {
  return (f: number, tl: number[]) => {
    const u = tl.indexOf(f) / Math.max(1, tl.length - 1)
    return u * duration
  }
}

const enter = (kind: NoteKind) => designs[kind].enter.draw

export const CYLHEIM_TARGETS: CylheimTarget[] = [
  { pattern: 'Note-Click-Enter-Textures-Click_in_{frame}.png', kind: 'click', timeline: range(1, 41), sample: enterAt, draw: enter('click') },
  { pattern: 'Note-Hold-Enter-Textures-Hold_Note-Hold_in_{frame}.png', kind: 'hold', timeline: [...twice(1, 8), ...range(9, 24), ...range(26, 40, 2)], sample: enterAt, draw: enter('hold') },
  { pattern: 'Note-LongHold-Enter-Textures-LongHold_in-LongHold_in_{frame}.png', kind: 'long-hold', timeline: [0, 0, 0, ...twice(1, 8), ...range(9, 40)], sample: enterAt, draw: enter('long-hold') },
  { pattern: 'Note-Drag-Enter-Textures-Drag_in_{frame}.png', kind: 'drag-head', timeline: range(1, 47), sample: enterAt, draw: enter('drag-head') },
  { pattern: 'Note-DragChild-Textures-DragChild_in_{frame}.png', kind: 'drag-child', timeline: range(1, 47), sample: enterAt, draw: enter('drag-child') },
  { pattern: 'Note-Flick-Enter-Textures-Flick_in_{frame}.png', kind: 'flick', timeline: [...twice(0, 6), ...range(7, 41)], sample: enterAt, draw: enter('flick') },

  { pattern: 'Note-Click-Bloom-Textures-Click_Boom_{frame}.png', kind: 'click', timeline: range(41, 50), sample: spread(tokens.time.clear.perfect), draw: designs.click.clear.perfect.draw },
  { pattern: 'Note-Drag-Bloom-Textures-Drag_Boom_{frame}.png', kind: 'drag-head', timeline: range(41, 50), sample: spread(tokens.time.clear.perfect), draw: designs['drag-head'].clear.perfect.draw },
  { pattern: 'Note-Flick-Bloom-Textures-Flick_BoomR_{frame}.png', kind: 'flick', timeline: range(41, 59), sample: spread(tokens.time.clear.perfect), draw: designs.flick.clear.perfect.draw },
  { pattern: 'Note-Hold-Bloom-Textures-Hold_Boom_{frame}.png', kind: 'hold', timeline: range(57, 74), sample: spread(tokens.time.clear.perfect), draw: designs.hold.clear.perfect.draw },
  { pattern: 'Note-LongHold-Bloom-Textures-LongHold_Boom_{frame}.png', kind: 'long-hold', timeline: range(58, 75), sample: spread(tokens.time.clear.perfect), draw: designs['long-hold'].clear.perfect.draw },

  { pattern: 'Note-Hold-Holding-Textures-Hold_Button_in-Hold_Button_in_{frame}.png', kind: 'hold', timeline: range(41, 49), sample: spread(tokens.time.holdPress), draw: designs.hold.hold!.press.draw, note: 'Cylheim loops this sequence; our press settles on its last frame.' },
  { pattern: 'Note-LongHold-Holding-Textures-LongHold_Button_in-LongHold_Button_in_{frame}.png', kind: 'long-hold', timeline: range(41, 57), sample: spread(tokens.time.holdPress), draw: designs['long-hold'].hold!.press.draw },
  { pattern: 'Note-Hold-Holding-Textures-Hold_Fire-Hold_Fire_{frame}.png', kind: 'hold', timeline: range(0, 30), sample: (f, tl) => (tl.indexOf(f) / tl.length) * tokens.time.holdLoop, draw: designs.hold.hold!.loop.draw, note: 'Centre-anchored; Cylheim offsets fire by 83 px and uses additive blending — needs an adapter.' },
  { pattern: 'Note-LongHold-Holding-Textures-LongHold_Fire-LongHold_Fire_{frame}.png', kind: 'long-hold', timeline: range(0, 30), sample: (f, tl) => (tl.indexOf(f) / tl.length) * tokens.time.holdLoop, draw: designs['long-hold'].hold!.loop.draw },
]
