/**
 * Design tokens — the single source of truth for sizes, strokes, timing and
 * semantic colours. Everything else is derived from these values.
 */

/** Note kinds, mirrors Cytoid `NoteType` naming. */
export const NOTE_KINDS = [
  'click',
  'hold',
  'long-hold',
  'drag-head',
  'drag-child',
  'flick',
  'click-drag-head',
  'click-drag-child',
  'drop-click',
  'drop-drag',
] as const
export type NoteKind = typeof NOTE_KINDS[number]

/** Colour families (what the user can re-hue). Mirrors Cytoid's fill colour slots. */
export const FAMILIES = ['click', 'hold', 'long-hold', 'flick', 'drag', 'click-drag', 'drop-click', 'drop-drag'] as const
export type Family = typeof FAMILIES[number]

export const FAMILY_OF: Record<NoteKind, Family> = {
  'click': 'click',
  'hold': 'hold',
  'long-hold': 'long-hold',
  'drag-head': 'drag',
  'drag-child': 'drag',
  'flick': 'flick',
  // "玩法和样式同 Click" — the head is a click note that starts a chain
  'click-drag-head': 'click',
  'click-drag-child': 'click-drag',
  'drop-click': 'drop-click',
  'drop-drag': 'drop-drag',
}

/** Scan direction of the page the note lives on. Cytoid picks the alt colour by it. */
export type Direction = 'up' | 'down'

export const GRADES = ['perfect', 'great', 'good', 'bad', 'miss'] as const
export type Grade = typeof GRADES[number]

export const tokens = {
  /** Click note outer diameter in design px. Every size is relative to it. */
  unit: 128,

  /** Relative outer size per kind (Cytoid `GameConfig` ratios). */
  size: {
    'click': 1,
    'hold': 1,
    'long-hold': 1,
    'drag-head': 0.8,
    'drag-child': 0.65,
    'flick': 1.125,
    'click-drag-head': 1,
    'click-drag-child': 0.65,
    'drop-click': 1,
    'drop-drag': 0.8,
  } satisfies Record<NoteKind, number>,

  stroke: {
    /** main white ring, relative to unit */
    ring: 0.085,
    /** secondary / decorative hairlines */
    hair: 0.022,
    /** hold progress ring */
    progress: 0.07,
    /** hold body width (Cytoid HoldLine: 0.56 × 1.133 world / 2.235 click ≈ 0.284) */
    holdBody: 0.284,
    /** drag connection width (Cytoid DragLine: 0.16 world / 2.235 click) */
    dragLine: 0.0716,
    /** drag connection dash and gap (Cytoid: 50 % duty, 0.16 world period) */
    dragDash: 0.0358,
  },

  /** Nominal clip durations (seconds). Normalised clips are stretched to fit the real window. */
  time: {
    /** enter (approach) clip: ends exactly at the hit time */
    enter: 1.2,
    /** hold press-in */
    holdPress: 0.2,
    /** hold loop period */
    holdLoop: 0.6,
    /** clear effects per grade (Cytoid FlatFX: 0.4 / speed) */
    clear: { perfect: 0.42, great: 0.46, good: 0.52, bad: 0.56, miss: 0.5 } satisfies Record<Grade, number>,
  },

  /** Judgement colours — Cytoid defaults. */
  grade: {
    perfect: '#5BC0EB',
    great: '#FDE74C',
    good: '#9BC53D',
    bad: '#E55934',
    miss: '#6B6F7A',
  } satisfies Record<Grade, string>,

  ring: '#FFFFFF',
  /** neutral ink used on top of fills (glyphs) */
  ink: '#1C1D24',
  /** playground stage background */
  stage: '#16171D',

  /**
   * Default family hues (OKLCH h°) for up / down scan direction.
   * Measured from Cytoid's defaults (#35A7FF / #FF5964 / #39E59E / #F2C85A).
   */
  hue: {
    'click': { up: 247, down: 20 },
    'hold': { up: 247, down: 20 },
    'flick': { up: 247, down: 20 },
    'long-hold': { up: 88, down: 70 },
    'drag': { up: 160, down: 160 },
    // same as click by default — click drag child differs from drag child by colour only
    'click-drag': { up: 247, down: 20 },
    'drop-click': { up: 247, down: 20 },
    'drop-drag': { up: 160, down: 160 },
  } satisfies Record<Family, Record<Direction, number>>,

  /** Base chroma for fills. */
  chroma: 0.165,
} as const

export type Tokens = typeof tokens

export const KIND_LABEL: Record<NoteKind, string> = {
  'click': 'Click',
  'hold': 'Hold',
  'long-hold': 'Long hold',
  'drag-head': 'Drag head',
  'drag-child': 'Drag child',
  'flick': 'Flick',
  'click-drag-head': 'Click drag head',
  'click-drag-child': 'Click drag child',
  'drop-click': 'Drop click',
  'drop-drag': 'Drop drag',
}

export const FAMILY_LABEL: Record<Family, string> = {
  'click': 'Click',
  'hold': 'Hold',
  'long-hold': 'Long hold',
  'flick': 'Flick',
  'drag': 'Drag',
  'click-drag': 'Click drag',
  'drop-click': 'Drop click',
  'drop-drag': 'Drop drag',
}
