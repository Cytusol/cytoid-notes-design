<script setup lang="ts">
import type { NoteKind } from '@cytoid/notes'
import { clipsOf, designs, KIND_LABEL, NOTE_KINDS } from '@cytoid/notes'
import { computed, ref, watch } from 'vue'
import NoteCanvas from '../components/NoteCanvas.vue'
import { clipMax } from '../composables/clips'
import { review } from '../composables/useReview'
import { useTransport } from '../composables/useTransport'

const kind = ref<NoteKind>('click')
const clipId = ref(designs.click.enter.id)
const clips = computed(() => clipsOf(designs[kind.value]))
const clip = computed(() => clips.value.find(c => c.id === clipId.value) || clips.value[0]!)
watch(kind, () => {
  clipId.value = clips.value[0]!.id
})
const { x, playing, loop, speed, step } = useTransport(clip)
const fps = ref(30)
const zoom = ref(1)
const onion = ref(false)
const showBounds = ref(false)
const compare = ref(false)
const filmstrip = ref(true)
const count = ref(9)
const samples = computed(() => Array.from({ length: count.value }, (_, i) => i / (count.value - 1) * clipMax(clip.value)))
</script>

<template>
  <div class="toolbar">
    <label>Kind <select v-model="kind"><option v-for="k in NOTE_KINDS" :key="k" :value="k">{{ KIND_LABEL[k] }}</option></select></label>
    <label>Clip <select v-model="clipId"><option v-for="c in clips" :key="c.id" :value="c.id">{{ c.id }}</option></select></label>
    <label>Direction <select v-model="review.direction"><option>up</option><option>down</option></select></label>
    <label>Zoom <input v-model.number="zoom" type="range" min="1" max="4" step="0.25"><span class="mono">{{ zoom }}×</span></label>
    <label><input v-model="compare" type="checkbox">Compare ↑ / ↓</label>
    <label><input v-model="review.judgement" type="checkbox">Judgement text</label>
  </div>
  <div class="inspector-stage surface" :class="[review.background, { compare }]">
    <div><span class="canvas-label">{{ compare ? 'UP' : review.direction.toUpperCase() }} / LIVE VECTOR</span><NoteCanvas :kind="kind" :direction="compare ? 'up' : review.direction" :clip="clip" :x="x" :scale="zoom" :onion="onion" :fps="fps" :show-bounds="showBounds" :judgement="review.judgement" /></div>
    <div v-if="compare">
      <span class="canvas-label">DOWN / LIVE VECTOR</span><NoteCanvas :kind="kind" direction="down" :clip="clip" :x="x" :scale="zoom" :onion="onion" :fps="fps" :show-bounds="showBounds" :judgement="review.judgement" />
    </div>
  </div>
  <div class="transport panel">
    <div class="toolbar compact">
      <button @click="playing = !playing">
        {{ playing ? 'Ⅱ Pause' : '▶ Play' }}
      </button><button class="quiet" aria-label="Previous frame" @click="step(-1, fps)">
        ← Frame
      </button><button class="quiet" @click="step(1, fps)">
        Frame →
      </button>
      <label>Step FPS <select v-model.number="fps"><option :value="30">30</option><option :value="60">60</option></select></label>
      <label>Speed <select v-model.number="speed"><option v-for="s in [0.25, 0.5, 1, 2]" :key="s" :value="s">{{ s }}×</option></select></label>
      <label><input v-model="loop" type="checkbox">Loop</label><span class="readout mono">x {{ x.toFixed(4) }} {{ clip.mode === 'once' || clip.mode === 'loop' ? 's' : '' }}</span>
    </div>
    <input v-model.number="x" class="timeline" type="range" min="0" :max="clipMax(clip)" step="0.0001" aria-label="Clip timeline" @input="playing = false">
    <div class="timeline-labels mono">
      <span>0</span><span>{{ clip.mode }} · {{ clip.duration }}s nominal</span><span>{{ clipMax(clip) }}</span>
    </div>
    <div class="toolbar compact">
      <label><input v-model="onion" type="checkbox">Onion skin ±2 frames</label><label><input v-model="showBounds" type="checkbox">Scene bounds</label><label><input v-model="filmstrip" type="checkbox">Filmstrip</label><label v-if="filmstrip">Samples <select v-model.number="count"><option :value="5">5</option><option :value="9">9</option><option :value="13">13</option></select></label>
    </div>
  </div>
  <div v-if="filmstrip" class="filmstrip" :style="{ '--count': count }">
    <button v-for="(sample, i) in samples" :key="i" class="film-frame surface" :class="review.background" :aria-label="`Seek to ${sample.toFixed(3)}`" @click="x = sample; playing = false">
      <NoteCanvas :kind="kind" :direction="review.direction" :clip="clip" :x="sample" :scale="0.4" /><span class="mono">{{ sample.toFixed(3) }}</span>
    </button>
  </div>
  <p class="caption">
    {{ clip.note || 'No additional clip notes.' }} <span v-if="clip.mode === 'progress'">The timeline drives gameplay progress, from 0 to 1.</span>
  </p>
</template>

<style scoped>
.inspector-stage { border: 1px solid var(--border); border-radius: 12px; height: 470px; display: grid; overflow: hidden; }
.inspector-stage.compare { grid-template-columns: 1fr 1fr; }
.inspector-stage>div { position: relative; min-width: 0; overflow: hidden; }
.inspector-stage>div+div { border-left: 1px solid var(--border); }
.canvas-label { position: absolute; top: 20px; left: 24px; font-size: 10px; color: #9299aa; letter-spacing: 1.5px; }
.transport { margin-top: 16px; padding: 16px 20px; }
.readout { margin-left: auto; color: var(--accent); }
.timeline { width: 100%; margin: 15px 0 8px; }
.timeline-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 15px; }
.filmstrip { display: grid; grid-template-columns: repeat(var(--count), minmax(70px, 1fr)); overflow-x: auto; gap: 8px; margin-top: 16px; }
.film-frame { height: 110px; position: relative; padding: 0; overflow: hidden; }
.film-frame span { position: absolute; bottom: 6px; left: 8px; font-size: 10px; color: #9299aa; }
</style>
