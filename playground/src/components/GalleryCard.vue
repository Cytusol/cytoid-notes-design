<script setup lang="ts">
import type { NoteKind } from 'cytoid-notes-design'
import type { CanvasFrame } from './StageCanvas.vue'
import { clipsOf, createContext, designs, drawScene, holdBody, KIND_LABEL, longHoldBody, renderNote } from 'cytoid-notes-design'
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
  const state = lifecycle(props.kind, elapsed, review.grade).state
  if (!state)
    return
  const dc = createContext(props.kind, { palette: palette.value, direction: review.direction, scale: review.scale })
  ctx.translate(width / 2, height / 2 + (props.kind === 'hold' ? (review.direction === 'up' ? 36 : -36) : 0))
  if (designs[props.kind].hold && (state.phase === 'enter' || state.phase === 'holding')) {
    const progress = state.phase === 'holding' ? state.progress : 0
    const appear = state.phase === 'enter' ? state.p : 1
    drawScene(ctx, props.kind === 'hold' ? holdBody({ length: 100, progress, appear, t: elapsed }, dc) : longHoldBody({ top: height / 2, bottom: height / 2, progress, appear }, dc))
  }
  drawScene(ctx, renderNote(props.kind, state, dc, { judgement: review.judgement }))
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
