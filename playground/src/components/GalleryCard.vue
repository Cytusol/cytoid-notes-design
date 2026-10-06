<script setup lang="ts">
import type { NoteKind } from 'cytoid-notes-design'
import type { CanvasFrame } from './StageCanvas.vue'
import { clipsOf, createContext, designs, drawScene, group, holdBody, KIND_LABEL, longHoldBody, renderNote } from 'cytoid-notes-design'
import { lifecycle } from '../composables/clips'
import { palette } from '../composables/usePalette'
import { review } from '../composables/useReview'
import NoteCanvas from './NoteCanvas.vue'
import StageCanvas from './StageCanvas.vue'

const props = defineProps<{
  kind: NoteKind
  index: number
}>()
let elapsed = 0
function paint({ ctx, width, height, dt }: CanvasFrame) {
  if (review.playing)
    elapsed += dt * review.speed
  const { state, t, span } = lifecycle(props.kind, elapsed, review.grade)
  const dc = createContext(props.kind, { palette: palette.value, direction: review.direction, scale: review.scale })
  const hold = designs[props.kind].hold
  const up = review.direction === 'up'
  ctx.translate(width / 2, height / 2 + (hold ? (up ? 36 : -36) : 0))
  // Virtual scanner (same recipe as the chart preview / player: 1.5px line, 6px
  // caps flush with the card edges). It crosses every note exactly when it is
  // judged — the centre for taps, the end position for holds — then keeps
  // sweeping off the card; the hold burst plays at that crossing point. Drops
  // lock the line at their hit position instead and fall onto it from above.
  // Drawn last: the scanline rides on top of everything (Cytoid).
  const drop = props.kind.startsWith('drop-')
  const anchor = hold ? (props.kind === 'hold' ? (up ? -100 : 100) : (up ? -1 : 1) * height * 0.325) : 0
  const near = (up ? 1 : -1) * (height / 2 - (hold ? 36 : 0))
  const scanY = drop ? 0 : near + ((anchor - near) / (hold ? span : 1.5)) * t
  const scanner = Math.abs(scanY) <= height / 2 + (hold ? 36 : 0)
    ? () => {
        ctx.fillStyle = '#e1e5f5'
        ctx.fillRect(-width / 2, scanY - 0.75, width, 1.5)
        ctx.fillRect(-width / 2, scanY - 3, 6, 6)
        ctx.fillRect(width / 2 - 6, scanY - 3, 6, 6)
      }
    : null
  if (!state) {
    scanner?.()
    return
  }
  if (hold && (state.phase === 'enter' || state.phase === 'holding')) {
    const progress = state.phase === 'holding' ? state.progress : 0
    const appear = state.phase === 'enter' ? state.p : 1
    drawScene(ctx, props.kind === 'hold' ? holdBody({ length: 100, progress, appear, t: elapsed }, dc) : longHoldBody({ top: height, bottom: height, progress, appear }, dc))
  }
  // Hold clears play where the scanline is the moment the hold ends (Cytus II):
  // the body end for holds, a representative line position for the full-height
  // pillar — exactly where the virtual scanner crosses at the end of holding.
  // Drops fall from above onto the locked line, landing when the approach ends.
  const fall = drop && state.phase === 'enter' ? -(1 - t / 1.5) * height * 0.35 : 0
  const fx = renderNote(props.kind, state, dc, { judgement: review.judgement })
  const fy = (hold && state.phase === 'clear' ? anchor : 0) + fall
  drawScene(ctx, fy ? group([fx], { transform: { y: fy } }) : fx)
  scanner?.()
}
</script>

<template>
  <article class="note-card">
    <header><span class="mono muted">{{ String(index + 1).padStart(2, '0') }}</span><h3>{{ KIND_LABEL[kind] }}</h3><span class="badge">{{ designs[kind].hold ? 'SUSTAIN' : 'TAP' }}</span></header>
    <div class="card-stage surface" :class="review.background">
      <div class="motion">
        <StageCanvas :paint="paint" :label="`${kind} full lifecycle`" /><span class="canvas-label">LIFECYCLE</span>
      </div>
      <div class="ready">
        <NoteCanvas :kind="kind" :direction="review.direction" :state="{ phase: 'enter', p: 1 }" :scale="review.scale * 0.55" /><span class="canvas-label">READY</span>
      </div>
    </div>
    <details>
      <summary>{{ designs[kind].enter.note || 'Clip notes' }}</summary><p v-for="clip in clipsOf(designs[kind])" :key="clip.id">
        <strong>{{ clip.id }}</strong> · {{ clip.note || clip.mode }}
      </p>
    </details>
  </article>
</template>

<style scoped>
.note-card { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--panel); }
header { display: flex; align-items: center; gap: 10px; padding: 17px 18px; }
h3 { font-size: 14px; margin: 0; flex: 1; }
.card-stage { height: 230px; display: grid; grid-template-columns: 1fr 100px; border-block: 1px solid var(--border); }
.motion,.ready { position: relative; min-width: 0; }
.ready { border-left: 1px solid #80808025; }
.canvas-label { position: absolute; bottom: 12px; left: 14px; font-size: 9px; letter-spacing: 1.4px; color: #89909e; }
details { padding: 13px 18px; color: var(--muted); font-size: 11px; line-height: 1.6; min-height: 58px; }
summary { cursor: pointer; } p { margin: 8px 0; } strong { color: var(--text); font-weight: 500; }
</style>
