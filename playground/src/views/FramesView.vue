<script setup lang="ts">
import type { Direction, NoteKind } from '@cytoid/notes'
import type { FrameManifest } from '@cytoid/notes/bake'
import { clipsOf, designs, frameIndex, KIND_LABEL, NOTE_KINDS, sampleTimes } from '@cytoid/notes'
import { CYLHEIM_TARGETS } from '@cytoid/notes/bake/cylheim'
import { computed, onMounted, ref, watch } from 'vue'
import NoteCanvas from '../components/NoteCanvas.vue'
import SpriteCanvas from '../components/SpriteCanvas.vue'
import { clipMax } from '../composables/clips'
import { useTransport } from '../composables/useTransport'

const manifest = ref<FrameManifest>()
const error = ref('')
const loading = ref(true)
const kind = ref<NoteKind>('click')
const direction = ref<Direction>('up')
const clipId = ref(designs.click.enter.id)
const fallback = designs.click.enter
const entries = computed(() => manifest.value?.notes[kind.value]?.[direction.value] || {})
const meta = computed(() => entries.value[clipId.value])
const clip = computed(() => clipsOf(designs[kind.value]).find(c => c.id === clipId.value) || fallback)
const playback = computed(() => meta.value || clip.value)
const { x, playing, loop } = useTransport(playback)
const index = computed(() => meta.value && manifest.value ? frameIndex(meta.value, meta.value.frames, x.value, manifest.value.fps) : 0)
const samples = computed(() => meta.value && manifest.value ? sampleTimes({ ...clip.value, ...meta.value }, manifest.value.fps, meta.value.frames) : [])
const quantized = ref(false)
const vectorX = computed(() => quantized.value ? samples.value[index.value] ?? x.value : x.value)
const url = computed(() => meta.value ? asset(meta.value.sheet.file) : '')
const kinds = computed(() => NOTE_KINDS.filter(k => manifest.value?.notes[k]))
const directions = computed(() => (['up', 'down'] as const).filter(d => manifest.value?.notes[kind.value]?.[d]))
const compat = computed(() => CYLHEIM_TARGETS.filter(t => t.kind === kind.value))
const bodies = computed(() => Object.entries(manifest.value?.bodies[direction.value] || {}))
const zoom = ref(1)
function asset(file: string) {
  return `${import.meta.env.BASE_URL}frames/${file}`
}
function chooseClip() {
  if (!entries.value[clipId.value])
    clipId.value = Object.keys(entries.value)[0] || fallback.id
}
watch(kind, () => {
  if (!directions.value.includes(direction.value))
    direction.value = directions.value[0] || 'up'
  chooseClip()
})
watch(direction, chooseClip)
async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(asset('manifest.json'))
    if (!response.ok)
      throw new Error(`Manifest unavailable (${response.status}).`)
    const value = await response.json()
    if (value.format !== 'cytoid-notes/frames@1' || !value.notes || !(value.fps > 0))
      throw new Error('No compatible frame manifest found.')
    manifest.value = value as FrameManifest
    kind.value = kinds.value[0] || 'click'
    if (!directions.value.includes(direction.value))
      direction.value = directions.value[0] || 'up'
    chooseClip()
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Unable to load baked frames.'
  }
  finally {
    loading.value = false
  }
}
onMounted(load)
function seekFrame(i: number) {
  const m = meta.value
  if (!m)
    return
  const frame = Math.max(0, Math.min(m.frames - 1, i))
  // Normalized and loop intervals include their left boundary; use the midpoint to avoid float rounding.
  x.value = m.mode === 'normalized' ? (frame + 0.5) / m.frames : m.mode === 'loop' ? (frame + 0.5) / m.frames * m.duration : samples.value[frame]!
  playing.value = false
}
function cellStyle(i: number) {
  const m = meta.value!
  const col = i % m.sheet.cols
  const row = Math.floor(i / m.sheet.cols)
  return { aspectRatio: `${m.width}/${m.height}`, backgroundImage: `url("${url.value}")`, backgroundSize: `${m.sheet.cols * 100}% ${m.sheet.rows * 100}%`, backgroundPosition: `${m.sheet.cols === 1 ? 0 : col / (m.sheet.cols - 1) * 100}% ${m.sheet.rows === 1 ? 0 : row / (m.sheet.rows - 1) * 100}%` }
}
</script>

<template>
  <div v-if="loading" class="empty panel">
    Loading frame manifest…
  </div>
  <div v-else-if="error" class="empty panel">
    <span class="eyebrow">BAKED ASSETS</span><h2>Generate your frame library</h2><p>{{ error }}</p><p>From the repository root, run <code>pnpm bake</code>, then reload this view.</p><button @click="load">
      ↺ Retry
    </button>
  </div>
  <template v-else-if="manifest">
    <div class="toolbar">
      <label>Kind <select v-model="kind"><option v-for="k in kinds" :key="k" :value="k">{{ KIND_LABEL[k] }}</option></select></label><label>Direction <select v-model="direction"><option v-for="d in directions" :key="d">{{ d }}</option></select></label><label>Clip <select v-model="clipId"><option v-for="(_, id) in entries" :key="id" :value="id">{{ id }}</option></select></label><label>Zoom <select v-model.number="zoom"><option v-for="z in [0.5, 1, 1.5, 2]" :key="z" :value="z">{{ z }}×</option></select></label><label><input v-model="quantized" type="checkbox">Snap vector to baked sample</label>
    </div>
    <template v-if="meta">
      <div class="frame-compare panel">
        <div class="surface dark">
          <span class="canvas-label">BAKED / {{ manifest.fps }} FPS</span><SpriteCanvas :meta="meta" :index="index" :url="url" :scale="zoom / manifest.scale" />
        </div><div class="surface dark">
          <span class="canvas-label">LIVE VECTOR / CURRENT PALETTE</span><NoteCanvas :kind="kind" :direction="direction" :clip="clip" :x="vectorX" :scale="zoom" />
        </div>
      </div>
      <div class="toolbar panel frame-transport">
        <button @click="playing = !playing">
          {{ playing ? 'Ⅱ Pause' : '▶ Play' }}
        </button><button class="quiet" @click="seekFrame(index - 1)">
          ← Frame
        </button><button class="quiet" @click="seekFrame(index + 1)">
          Frame →
        </button><label><input v-model="loop" type="checkbox">Loop</label><input v-model.number="x" class="scrubber" type="range" min="0" :max="clipMax(playback)" step="0.0001" aria-label="Baked frame timeline" @input="playing = false"><span class="mono">{{ index + 1 }} / {{ meta.frames }} · x {{ x.toFixed(3) }}</span>
      </div>
      <div class="frame-info">
        <table class="panel">
          <tbody>
            <tr><th>Frame</th><td>{{ meta.width }} × {{ meta.height }} px</td><th>Sheet</th><td>{{ meta.sheet.cols }} × {{ meta.sheet.rows }}</td></tr><tr><th>Count / FPS</th><td>{{ meta.frames }} / {{ manifest.fps }}</td><th>Anchor</th><td>{{ meta.anchor.join(', ') }}</td></tr><tr><th>Mode / duration</th><td>{{ meta.mode }} / {{ meta.duration }}s</td><th>Bake scale</th><td>{{ manifest.scale }}×</td></tr><tr>
              <th>Sampling</th><td colspan="3" class="mono">
                {{ meta.sampling }}
              </td>
            </tr>
          </tbody>
        </table><p class="caption">
          Baked colours come from the manifest. Live colours use the global palette. Continuous playback exposes sampling differences; snap to compare identical poses.
        </p>
      </div>
      <div class="section-heading">
        <h3>Every frame</h3><a :href="url" target="_blank" rel="noopener">Open sprite sheet ↗</a>
      </div>
      <div class="frame-grid">
        <button v-for="(_, i) in samples" :key="i" class="frame-cell" :class="{ selected: index === i }" :aria-label="`Seek to frame ${i + 1}`" @click="seekFrame(i)">
          <div :style="cellStyle(i)" /><span class="mono">{{ String(i).padStart(3, '0') }}</span>
        </button>
      </div>
    </template>
    <details class="panel asset-list">
      <summary>Body textures · {{ direction }} ({{ bodies.length }})</summary><div v-for="[name, body] in bodies" :key="name">
        <a :href="asset(body.file)" target="_blank" rel="noopener">{{ name }} ↗</a><span class="mono">{{ body.width }} × {{ body.height }} · {{ body.repeat }}</span><p class="caption">
          {{ body.note }}
        </p>
      </div>
    </details>
    <details class="panel asset-list">
      <summary>Cylheim compatibility · {{ KIND_LABEL[kind] }} ({{ compat.length }} patterns)</summary><p class="caption">
        Optional export generated by the baker's Cylheim option. Files retain Cylheim's original frame numbers and repeated timeline slots.
      </p><div v-for="target in compat" :key="target.pattern">
        <p class="mono pattern">
          {{ target.pattern }}
        </p><div class="compat-links">
          <a v-for="frame in [...new Set(target.timeline)]" :key="frame" :href="asset(`cylheim/${target.pattern.replace('{frame}', String(frame).padStart(5, '0'))}`)" target="_blank" rel="noopener">{{ frame }}</a>
        </div><p v-if="target.note" class="caption">
          {{ target.note }}
        </p>
      </div>
    </details>
  </template>
</template>

<style scoped>
.empty { padding: 70px; text-align: center; } .empty p { color: var(--muted); }
.frame-compare { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }
.frame-compare>div { position: relative; height: 350px; overflow: hidden; }
.frame-compare>div+div { border-left: 1px solid var(--border); }
.canvas-label { position: absolute; top: 20px; left: 24px; color: #9299aa; font-size: 10px; letter-spacing: 1.3px; }
.frame-transport { margin-top: 14px; padding: 14px 20px; }
.scrubber { flex: 1; min-width: 100px; }
.frame-info { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-top: 20px; }
table { width: 100%; border-collapse: separate; border-spacing: 0; padding: 12px; font-size: 12px; }
th,td { text-align: left; padding: 9px 12px; } th { color: var(--muted); font-weight: 400; }
.frame-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
.frame-cell { background: var(--stage); padding: 8px; min-width: 0; } .frame-cell.selected { border-color: var(--accent); }
.frame-cell>div { width: 100%; background-repeat: no-repeat; }
.frame-cell span { display: block; color: var(--muted); font-size: 10px; margin-top: 8px; }
.asset-list { margin-top: 22px; padding: 20px; font-size: 12px; }
.asset-list summary { cursor: pointer; } .asset-list>div { border-top: 1px solid var(--border); padding: 12px 0; }
.asset-list span { margin-left: 20px; color: var(--muted); }
.pattern { overflow-wrap: anywhere; } .compat-links { display: flex; flex-wrap: wrap; gap: 10px; }
@media(max-width: 800px) { .frame-info { grid-template-columns: 1fr; } }
</style>
