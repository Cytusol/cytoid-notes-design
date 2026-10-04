import type { Clip, Grade, NoteKind, NoteState } from 'cytoid-notes-design'
import { designs, tokens } from 'cytoid-notes-design'

export function clipMax(clip: Pick<Clip, 'mode' | 'duration'>) {
  return clip.mode === 'once' || clip.mode === 'loop' ? clip.duration : 1
}
export function lifecycle(kind: NoteKind, time: number, grade: Grade): { state: NoteState | null, label: string } {
  const hold = designs[kind].hold ? 1.8 : 0
  const clear = tokens.time.clear[grade]
  const t = time % (1.5 + hold + clear + 0.65)
  if (t < 1.5)
    return { state: { phase: 'enter', p: t / 1.5 }, label: 'Approach' }
  if (t < 1.5 + hold)
    return { state: { phase: 'holding', t: t - 1.5, progress: (t - 1.5) / hold }, label: 'Holding' }
  if (t < 1.5 + hold + clear)
    return { state: grade === 'miss' ? { phase: 'miss', t: t - 1.5 - hold } : { phase: 'clear', grade, t: t - 1.5 - hold }, label: grade }
  return { state: null, label: 'Pause' }
}
