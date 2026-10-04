import { describe, expect, it } from 'vitest'
import {
  bounds,
  clipsOf,
  createContext,
  createPalette,
  designs,
  frameIndex,
  GRADES,
  hexToOklch,
  judgementClips,
  NOTE_KINDS,
  oklch,
  renderNote,
  sampleTimes,
  toSVG,
} from '../src'

describe('color', () => {
  it('round-trips hex through oklch', () => {
    const { l, c, h } = hexToOklch('#35A7FF')
    expect(oklch(l, c, h).toLowerCase()).toBe('#35a7ff')
  })
  it('palette honours hue overrides and raw hex', () => {
    const p = createPalette({ families: { click: { up: 140, down: '#FF0000' } } })
    expect(p.family('click', 'up').hue).toBeCloseTo(140, 0)
    expect(p.family('click', 'down').fill.toLowerCase()).toBe('#ff0000')
  })
})

describe('designs', () => {
  for (const kind of NOTE_KINDS) {
    it(`${kind}: every clip renders finite geometry`, () => {
      const ctx = createContext(kind)
      for (const clip of clipsOf(designs[kind])) {
        for (const x of sampleTimes(clip, 30)) {
          const node = clip.draw(x, ctx)
          const svg = toSVG(node)
          expect(svg).not.toMatch(/NaN|Infinity/)
          const b = bounds(node)
          if (b)
            expect(b.every(Number.isFinite)).toBe(true)
        }
      }
    })
  }

  it('enter ends at a stable, fully visible pose', () => {
    for (const kind of NOTE_KINDS) {
      const b = bounds(renderNote(kind, { phase: 'enter', p: 1 }))
      expect(b, kind).not.toBeNull()
    }
  })

  it('clear effects fade out completely', () => {
    for (const kind of NOTE_KINDS) {
      const d = designs[kind]
      const ctx = createContext(kind)
      for (const clip of [...Object.values(d.clear), d.miss])
        expect(bounds(clip.draw(clip.duration, ctx)), `${kind}/${clip.id}`).toBeNull()
    }
  })

  it('drop notes are static images', () => {
    for (const kind of ['drop-click', 'drop-drag'] as const) {
      const clip = designs[kind].enter
      const ctx = createContext(kind)
      expect(clip.mode).toBe('static')
      expect(sampleTimes(clip, 30)).toHaveLength(1)
      expect(toSVG(clip.draw(0, ctx))).toBe(toSVG(clip.draw(1, ctx)))
    }
  })

  it('drag series reach a steady pose early', () => {
    for (const kind of ['drag-head', 'drag-child', 'click-drag-child'] as const) {
      const ctx = createContext(kind)
      expect(toSVG(designs[kind].enter.draw(0.25, ctx)), kind).toBe(toSVG(designs[kind].enter.draw(1, ctx)))
    }
  })

  it('judgement text renders for every grade and fades out', () => {
    const ctx = createContext('click')
    for (const grade of GRADES) {
      const clip = judgementClips[grade]
      expect(bounds(clip.draw(clip.duration * 0.5, ctx)), grade).not.toBeNull()
      expect(bounds(clip.draw(clip.duration, ctx)), grade).toBeNull()
    }
    const withText = toSVG(renderNote('click', { phase: 'clear', grade: 'perfect', t: 0.2 }))
    const without = toSVG(renderNote('click', { phase: 'clear', grade: 'perfect', t: 0.2 }, undefined, { judgement: false }))
    expect(withText.length).toBeGreaterThan(without.length)
  })

  it('hold loop is seamless', () => {
    const clip = designs.hold.hold!.loop
    const ctx = createContext('hold')
    expect(toSVG(clip.draw(0, ctx))).toBe(toSVG(clip.draw(clip.duration, ctx)))
  })
})

describe('sampling', () => {
  it('normalized frames: last frame is the hit pose and index inverts sampling', () => {
    const clip = designs.click.enter
    const xs = sampleTimes(clip, 30)
    expect(xs.at(-1)).toBe(1)
    xs.forEach((x, i) => expect(frameIndex(clip, xs.length, x - 1e-9, 30)).toBe(i))
  })
})
