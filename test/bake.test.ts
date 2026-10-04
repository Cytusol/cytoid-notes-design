import { describe, expect, it } from 'vitest'
import { CYLHEIM_TARGETS, cylheimSamples } from '../src/bake/cylheim'
import { flickLock } from '../src/notes/flick'

describe('cylheim mapping', () => {
  it('enter timelines end on the hit pose', () => {
    for (const t of CYLHEIM_TARGETS.filter(t => t.pattern.includes('Enter') || t.pattern.includes('DragChild') || t.pattern.includes('Drop'))) {
      const s = cylheimSamples(t)
      expect(Math.max(...s.map(x => x.x)), t.pattern).toBe(1)
    }
  })
  it('hold exports every grouped-popup frame 17–40', () => {
    const hold = CYLHEIM_TARGETS.find(t => t.pattern.includes('Hold_Note-Hold_in'))!
    const frames = cylheimSamples(hold).map(s => s.f)
    for (let f = 17; f <= 40; f++)
      expect(frames).toContain(f)
  })
  it('samples are monotonic in frame number', () => {
    for (const t of CYLHEIM_TARGETS) {
      const xs = cylheimSamples(t).map(s => s.x)
      xs.slice(1).forEach((x, i) => expect(x, t.pattern).toBeGreaterThanOrEqual(xs[i]!))
    }
  })
})

describe('flick lock', () => {
  it('matches Cytoid earlyClose = min(0.25s, approach/2)', () => {
    expect(1 - flickLock(1.2)).toBeCloseTo(0.25 / 1.2)
    expect(1 - flickLock(0.4)).toBeCloseTo(0.5)
  })
})
