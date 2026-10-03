<script setup lang="ts">
import type { CanvasFrame } from '../components/StageCanvas.vue'
import type { GradeMix } from '../composables/chart'
import { KIND_LABEL } from 'cytoid-notes-design'
import { computed, ref } from 'vue'
import StageCanvas from '../components/StageCanvas.vue'
import { chart, chartKinds, chartLength, directionFor, gradeFor, paintChart } from '../composables/chart'
import { palette } from '../composables/usePalette'

const playing = ref(true)
const time = ref(0)
const speed = ref(1)
const mix = ref<GradeMix>('perfect')
const scale = ref(0.45)
const page = computed(() => Math.floor(time.value) + 1)
const judged = computed(() => chart.filter(n => (n.end ?? n.hit) <= time.value % chartLength).length)
function paint({ ctx, width, height, dt }: CanvasFrame) {
  if (playing.value)
    time.value += dt * speed.value
  paintChart(ctx, width, height, time.value, palette.value, mix.value, scale.value)
}
</script>

<template>
  <div class="toolbar">
    <button @click="playing = !playing">
      {{ playing ? 'Ⅱ Pause autoplay' : '▶ Play autoplay' }}
    </button><button class="quiet" @click="time = 0">
      ↺ Restart
    </button>
    <label>Judgements <select v-model="mix"><option value="perfect">All perfect</option><option value="mixed">Mixed grades</option><option value="misses">Include misses</option></select></label>
    <label>Speed <select v-model.number="speed"><option v-for="s in [0.25, 0.5, 1, 1.5, 2]" :key="s" :value="s">{{ s }}×</option></select></label>
    <label>Note scale <input v-model.number="scale" type="range" min="0.25" max="0.8" step="0.05"><span class="mono">{{ scale.toFixed(2) }}×</span></label>
  </div>
  <div class="chart-layout">
    <div class="panel gameplay">
      <div class="game-header">
        <div><span class="eyebrow">MOCK CHART / AUTOPLAY</span><h3>Across the spectrum</h3></div><div class="game-stats mono">
          <span>120 BPM</span><span>{{ directionFor(time) === 'up' ? '↑ UP' : '↓ DOWN' }}</span><span>PAGE {{ page }}</span>
        </div>
      </div>
      <div class="play-area">
        <StageCanvas :paint="paint" label="Autoplay chart showing all ten note types and an alternating scan line" />
      </div>
      <div class="game-footer mono">
        <span>{{ (time % chartLength).toFixed(2) }} / {{ chartLength }}s</span><span>{{ judged }} / {{ chart.length }} JUDGED</span><span>2 BEATS / PAGE</span>
      </div>
      <input v-model.number="time" class="chart-timeline" type="range" min="0" :max="chartLength" step="0.001" aria-label="Chart time" @input="playing = false">
    </div>
    <aside class="panel chart-notes">
      <span class="eyebrow">CHART CONTENTS</span><h3>Ten kinds. One stage.</h3><p class="caption">
        1.1-page approach window. Page colours follow the note's hit direction. Holds finish at their end time.
      </p><div v-for="kind in chartKinds" :key="kind" class="kind-row">
        <span class="dot" :style="{ background: palette.note(kind, 'up').fill }" />{{ KIND_LABEL[kind] }}
      </div><hr><p class="caption">
        {{ chart.filter((_, i) => gradeFor(i, mix) === 'miss').length }} misses per loop · {{ chartLength }} pages
      </p><p class="caption">
        Drag connections grow before each hit and retract behind the scanner. Drop notes fall onto their hit position.
      </p>
    </aside>
  </div>
</template>

<style scoped>
.chart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; align-items: start; }
.gameplay { overflow: hidden; }
.game-header,.game-footer { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; }
.game-header h3 { margin: 8px 0 0; font-size: 17px; font-weight: 500; }
.game-stats { display: flex; gap: 20px; font-size: 11px; color: var(--muted); }
.play-area { width: 100%; aspect-ratio: 16/9; background: var(--stage); border-block: 1px solid var(--border); overflow: hidden; }
.game-footer { font-size: 10px; color: var(--muted); }
.chart-timeline { width: calc(100% - 48px); margin: 0 24px 20px; }
.chart-notes { padding: 24px; }
.chart-notes h3 { font-weight: 500; font-size: 17px; }
.kind-row { display: flex; align-items: center; gap: 12px; margin: 17px 0; font-size: 12px; }
@media(max-width: 1000px) { .chart-layout { grid-template-columns: 1fr; } }
</style>
