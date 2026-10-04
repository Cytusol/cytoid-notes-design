import type { Direction, Family, Grade, NoteKind } from './tokens'
import { alpha, hexToOklch, oklch } from './core/color'
import { FAMILIES, FAMILY_OF, tokens } from './tokens'

/**
 * A colour input is either an OKLCH hue in degrees (recommended — the
 * design keeps its lightness/chroma balance) or a raw `#rrggbb` (Cytoid
 * custom colour compatibility; its own lightness & chroma are respected).
 */
export type ColorInput = number | string

export interface PaletteOptions {
  /** rotate every family hue by this many degrees */
  hueShift?: number
  /** per family / direction overrides */
  families?: Partial<Record<Family, Partial<Record<Direction, ColorInput>>>>
  /** global chroma multiplier (0 = monochrome) */
  saturation?: number
  /** ring colour (Cytoid `note_ring_colors`) */
  ring?: string
  grades?: Partial<Record<Grade, string>>
}

/** Fully resolved colours for one family + direction. */
export interface NotePalette {
  /** main flat fill */
  fill: string
  /** darker step of the fill — flat two-tone shading, inner discs */
  deep: string
  /** lighter step — highlights, flashes */
  light: string
  /**
   * depth 3 of the 1-2-3 depth scale (deep · fill · core): bright but still
   * saturated — the Click / Flick timing core
   */
  core: string
  /** dim track colour (bodies, ghost shapes) */
  track: string
  /** white ring by default */
  ring: string
  /** dark glyph colour on top of fills */
  ink: string
  /** hue that produced this palette (for effects) */
  hue: number
}

export interface Palette {
  note: (kind: NoteKind, direction: Direction) => NotePalette
  family: (family: Family, direction: Direction) => NotePalette
  grade: Record<Grade, string>
  ring: string
}

/**
 * Lightness tuned by hue: yellows/greens need more L to read as the same
 * "weight" as blues/reds against a dark stage.
 */
export function fitLightness(h: number): number {
  const d = Math.abs(((h - 100 + 540) % 360) - 180)
  return 0.705 + 0.13 * Math.exp(-((d / 48) ** 2))
}

export function derivePalette(input: ColorInput, opts: { saturation?: number, ring?: string } = {}): NotePalette {
  const sat = opts.saturation ?? 1
  let l: number, c: number, h: number
  if (typeof input === 'number') {
    h = ((input % 360) + 360) % 360
    l = fitLightness(h)
    c = tokens.chroma
  }
  else {
    ({ l, c, h } = hexToOklch(input))
  }
  c *= sat
  return {
    fill: oklch(l, c, h),
    deep: oklch(l - 0.17, c * 0.9, h),
    light: oklch(Math.min(0.97, l + 0.13), c * 0.55, h),
    core: oklch(Math.min(0.95, l + 0.12), c * 0.8, h),
    track: oklch(l * 0.55, c * 0.55, h),
    ring: opts.ring ?? tokens.ring,
    ink: oklch(0.24, Math.min(0.04, c * 0.3), h),
    hue: h,
  }
}

export function createPalette(options: PaletteOptions = {}): Palette {
  const cache = new Map<string, NotePalette>()
  const shift = options.hueShift ?? 0
  const family = (fam: Family, dir: Direction): NotePalette => {
    const key = `${fam}:${dir}`
    let p = cache.get(key)
    if (!p) {
      const override = options.families?.[fam]?.[dir]
      const input = override ?? tokens.hue[fam][dir] + shift
      p = derivePalette(typeof input === 'number' && override !== undefined ? input + shift : input, {
        saturation: options.saturation,
        ring: options.ring,
      })
      cache.set(key, p)
    }
    return p
  }
  return {
    family,
    note: (kind, dir) => family(FAMILY_OF[kind], dir),
    grade: { ...tokens.grade, ...options.grades },
    ring: options.ring ?? tokens.ring,
  }
}

export const defaultPalette = createPalette()

/** Snapshot every family into plain hex — handy for exporting to Cytoid settings JSON. */
export function exportPalette(p: Palette) {
  const out: Record<string, Record<Direction, NotePalette>> = {}
  for (const f of FAMILIES)
    out[f] = { up: p.family(f, 'up'), down: p.family(f, 'down') }
  return { families: out, grade: p.grade, ring: p.ring }
}

export { alpha }
