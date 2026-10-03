import type { Direction, Grade, NoteKind, NoteState, Palette } from 'cytoid-notes-design'
import { clamp01, createContext, designs, dragLine, drawScene, holdBody, longHoldBody, renderNote, tokens } from 'cytoid-notes-design'

export interface ChartNote { kind: NoteKind, hit: number, x: number, end?: number, chain?: string }
export type GradeMix = 'perfect' | 'mixed' | 'misses'
export const chartLength = 12
export const chart: ChartNote[] = [
  { kind: 'click', hit: 0.3, x: 0.22 },
  { kind: 'flick', hit: 0.75, x: 0.7 },
  { kind: 'hold', hit: 1.15, end: 1.85, x: 0.36 },
  { kind: 'drop-click', hit: 1.6, x: 0.73 },
  { kind: 'drag-head', hit: 2.16, x: 0.22, chain: 'a' },
  { kind: 'drag-child', hit: 2.42, x: 0.45, chain: 'a' },
  { kind: 'drag-child', hit: 2.7, x: 0.67, chain: 'a' },
  { kind: 'click-drag-head', hit: 3.12, x: 0.76, chain: 'b' },
  { kind: 'click-drag-child', hit: 3.42, x: 0.51, chain: 'b' },
  { kind: 'click-drag-child', hit: 3.78, x: 0.27, chain: 'b' },
  { kind: 'long-hold', hit: 4.25, end: 6.65, x: 0.26 },
  { kind: 'drop-drag', hit: 4.6, x: 0.72 },
  { kind: 'click', hit: 5.2, x: 0.58 },
  { kind: 'flick', hit: 5.7, x: 0.77 },
  { kind: 'drop-click', hit: 6.35, x: 0.65 },
  { kind: 'drag-head', hit: 7.16, x: 0.75, chain: 'c' },
  { kind: 'drag-child', hit: 7.43, x: 0.5, chain: 'c' },
  { kind: 'drag-child', hit: 7.75, x: 0.25, chain: 'c' },
  { kind: 'click-drag-head', hit: 8.14, x: 0.25, chain: 'd' },
  { kind: 'click-drag-child', hit: 8.44, x: 0.48, chain: 'd' },
  { kind: 'click-drag-child', hit: 8.78, x: 0.73, chain: 'd' },
  { kind: 'hold', hit: 9.12, end: 9.82, x: 0.68 },
  { kind: 'drop-drag', hit: 9.6, x: 0.3 },
  { kind: 'long-hold', hit: 10.22, end: 11.75, x: 0.72 },
  { kind: 'flick', hit: 10.6, x: 0.26 },
  { kind: 'click', hit: 11.4, x: 0.42 },
]
export function gradeFor(index: number, mix: GradeMix): Grade {
  if (mix === 'perfect')
    return 'perfect'
  const grades: Grade[] = mix === 'mixed' ? ['perfect', 'great', 'perfect', 'good', 'bad', 'perfect'] : ['perfect', 'miss', 'great', 'good', 'miss', 'bad']
  return grades[index % grades.length]!
}
export function directionFor(hit: number): Direction {
  return Math.floor(hit) % 2 === 0 ? 'up' : 'down'
}
export function notePosition(note: ChartNote, width: number, height: number) {
  const direction = directionFor(note.hit)
  const p = note.hit % 1
  return { x: 50 + note.x * (width - 100), y: 35 + (direction === 'up' ? 1 - p : p) * (height - 70) }
}
function stateAt(note: ChartNote, t: number, grade: Grade): NoteState | null {
  if (t < note.hit - 1.1)
    return null
  if (t < note.hit)
    return { phase: 'enter', p: clamp01((t - (note.hit - 1.1)) / 1.1) }
  if (grade === 'miss')
    return t - note.hit <= tokens.time.clear.miss ? { phase: 'miss', t: t - note.hit } : null
  if (note.end && t < note.end)
    return { phase: 'holding', t: t - note.hit, progress: clamp01((t - note.hit) / (note.end - note.hit)) }
  const since = t - (note.end ?? note.hit)
  return since <= tokens.time.clear[grade] ? { phase: 'clear', grade, t: since } : null
}
export function paintChart(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, palette: Palette, mix: GradeMix, scale: number) {
  const phase = time % 1
  const direction = directionFor(time)
  const lineY = 35 + (direction === 'up' ? 1 - phase : phase) * (height - 70)
  ctx.strokeStyle = '#ffffff0b'
  ctx.lineWidth = 1
  for (let i = 0; i <= 8; i++) {
    const x = 50 + (width - 100) * i / 8
    ctx.beginPath()
    ctx.moveTo(x, 35)
    ctx.lineTo(x, height - 35)
    ctx.stroke()
  }
  ctx.strokeRect(50, 35, width - 100, height - 70)
  const cycle = Math.floor(time / chartLength)
  for (let offset = -1; offset <= 1; offset++) {
    const local = time - (cycle + offset) * chartLength
    if (cycle + offset < 0)
      continue
    // Connections beneath heads, growing toward the destination and retracting after the source hit.
    chart.forEach((note, i) => {
      const next = chart[i + 1]
      if (!note.chain || next?.chain !== note.chain)
        return
      const a = notePosition(note, width, height)
      const b = notePosition(next, width, height)
      const dc = createContext(note.kind, { palette, direction: directionFor(note.hit), scale })
      const node = dragLine({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, lead: clamp01((local - (next.hit - 1.1)) / 0.5), trail: clamp01((local - note.hit) / (next.hit - note.hit)) }, dc)
      if (node) {
        ctx.save()
        drawScene(ctx, node)
        ctx.restore()
      }
    })
    chart.forEach((note, i) => {
      const grade = gradeFor(i, mix)
      const state = stateAt(note, local, grade)
      if (!state)
        return
      const dc = createContext(note.kind, { palette, direction: directionFor(note.hit), scale })
      const pos = notePosition(note, width, height)
      // Drops approach from the origin side of this page's scanner and meet it at hit time.
      if (note.kind.startsWith('drop-') && state.phase === 'enter')
        pos.y += (dc.direction === 'up' ? 1 : -1) * (note.hit - local) * (height - 70) * 0.65
      ctx.save()
      ctx.translate(pos.x, pos.y)
      if (note.end && (state.phase === 'enter' || state.phase === 'holding')) {
        const progress = state.phase === 'holding' ? state.progress : 0
        const appear = state.phase === 'enter' ? state.p : 1
        drawScene(ctx, note.kind === 'long-hold'
          ? longHoldBody({ top: pos.y - 35, bottom: height - 35 - pos.y, progress, appear }, dc)
          : holdBody({ length: (note.end - note.hit) * (height - 70), progress, appear, t: local - note.hit }, dc))
      }
      drawScene(ctx, renderNote(note.kind, state, dc))
      ctx.restore()
    })
  }
  ctx.save()
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.strokeStyle = '#e1e5f5'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(30, lineY)
  ctx.lineTo(width - 30, lineY)
  ctx.stroke()
  ctx.fillStyle = '#e1e5f5'
  ctx.fillRect(28, lineY - 3, 6, 6)
  ctx.fillRect(width - 34, lineY - 3, 6, 6)
  ctx.restore()
}
export const chartKinds = [...new Set(chart.map(n => n.kind))]
export { designs }
