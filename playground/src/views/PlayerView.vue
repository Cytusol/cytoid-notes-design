<script setup lang="ts">
import type { Palette } from 'cytoid-notes-design'
import type { ParsedChart } from '../../player/chart'
import type { LoadedLevel } from '../../player/level'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { parseChart } from '../../player/chart'
import { loadLevelFromUrl, loadLevelFromZip } from '../../player/level'
import { Player } from '../../player/player'
import { palette as reviewPalette } from '../composables/usePalette'

const hostEl = ref<HTMLElement | null>(null)
const level = ref<LoadedLevel | null>(null)
const current = ref(-1)
const loading = ref(false)
const error = ref('')
const playing = ref(false)
const time = ref(0)
const duration = ref(0)
const scale = ref(0.85)
const speed = ref(1)
const offsetMs = ref(0)
const judgement = ref(true)
const playMode = ref(false)
const stats = ref<{ combo: number, maxCombo: number, perfect: number, great: number, good: number, bad: number, miss: number, judged: number } | null>(null)
const dragging = ref(false)
const isDemo = ref(false)

let player: Player | null = null
let uiTimer = 0

const difficulty = computed(() => (level.value && current.value >= 0 ? level.value.difficulties[current.value] : null))

function fmt(t: number) {
  const s = Math.max(0, Math.floor(t))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

async function mount() {
  if (!hostEl.value || player)
    return
  player = new Player({
    palette: reviewPalette.value,
    scale: scale.value,
    judgement: judgement.value,
    deviceOffset: offsetMs.value / 1000,
    rate: speed.value,
    playMode: playMode.value,
  })
  await player.attach(hostEl.value)
  uiTimer = window.setInterval(() => {
    if (!player || dragging.value)
      return
    time.value = player.time
    if (player.playing !== playing.value)
      playing.value = player.playing
    const d = player.duration
    if (d > 0 && Math.abs(d - duration.value) > 0.25)
      duration.value = d
    if (player.playMode) {
      const s = player.stats
      if (s && s.judged !== stats.value?.judged)
        stats.value = { ...s }
    }
    else if (stats.value) {
      stats.value = null
    }
  }, 1000 / 30)
}

onMounted(mount)
onUnmounted(() => {
  window.clearInterval(uiTimer)
  player?.destroy()
  player = null
})

watch(reviewPalette, (p: Palette) => player?.setPalette(p))
watch([scale, judgement], () => player?.updateOptions({ scale: scale.value, judgement: judgement.value }))
watch(playMode, () => {
  stats.value = null
  player?.updateOptions({ playMode: playMode.value })
})
watch(speed, () => {
  player?.updateOptions({ rate: speed.value })
  if (playing.value)
    player?.play(player.time)
})
watch(offsetMs, () => player?.updateOptions({ deviceOffset: offsetMs.value / 1000 }))

const DEMO_LEVEL = `${import.meta.env.BASE_URL}level/teages.yunomi.yumeiroparedo/`

async function loadDemo() {
  error.value = ''
  loading.value = true
  try {
    const loaded = await loadLevelFromUrl(DEMO_LEVEL)
    level.value = loaded
    current.value = playableIndex(loaded)
    isDemo.value = true
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    level.value = null
    isDemo.value = false
  }
  finally {
    loading.value = false
  }
}

async function load(file: File) {
  error.value = ''
  loading.value = true
  try {
    const loaded = await loadLevelFromZip(file)
    level.value = loaded
    current.value = playableIndex(loaded)
    if (current.value < 0)
      error.value = loaded.difficulties.some(d => d.legacy) ? 'Only legacy C1 charts found (converter not ported yet).' : 'No playable chart in this level.'
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    level.value = null
  }
  finally {
    loading.value = false
    isDemo.value = false
  }
}

function playableIndex(loaded: LoadedLevel) {
  return loaded.difficulties.findIndex(d => d.chart != null)
}

watch(current, () => {
  const d = difficulty.value
  if (!player || !d?.chart)
    return
  const parsed: ParsedChart = parseChart(d.chart)
  player.load(d.chart, d.audio)
  duration.value = player.duration
  player.seek(0)
  void parsed
})

function toggle() {
  if (!player || !difficulty.value?.chart)
    return
  if (player.playing) {
    player.pause()
    playing.value = false
  }
  else {
    if (player.time >= duration.value - 0.05)
      player.seek(0)
    player.play()
    playing.value = true
  }
}

function onTimeline(e: Event) {
  if (!player)
    return
  const v = Number((e.target as HTMLInputElement).value)
  time.value = v
  player.seek(v)
}

function onSeek(e: Event) {
  if (!player)
    return
  dragging.value = true
  const v = Number((e.target as HTMLInputElement).value)
  time.value = v
  player.seek(v)
  dragging.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file)
    void load(file)
}

const activePointers = new Map<number, { x: number, y: number }>()
function toLocal(e: PointerEvent) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function onDown(e: PointerEvent) {
  if (!player?.playMode || !playing.value)
    return
  const p = toLocal(e)
  activePointers.set(e.pointerId, p)
  player.press(p.x, p.y, e.pointerId)
}
function onMove(e: PointerEvent) {
  if (!player)
    return
  const p = toLocal(e)
  if (activePointers.has(e.pointerId))
    activePointers.set(e.pointerId, p)
  player.move(p.x, p.y, e.pointerId)
}
function onUp(e: PointerEvent) {
  if (!player || !activePointers.has(e.pointerId))
    return
  activePointers.delete(e.pointerId)
  player.release(e.pointerId)
}
</script>

<template>
  <div class="toolbar">
    <button :disabled="!difficulty?.chart" @click="toggle">
      {{ playing ? 'Ⅱ Pause' : '▶ Play' }}
    </button>
    <label>Time <input class="mono" style="width: 110px" type="range" min="0" :max="duration || 1" step="0.01" :value="time" @input="onSeek"></label>
    <span class="mono muted">{{ fmt(time) }} / {{ fmt(duration) }}</span>
    <label>Speed <select v-model.number="speed"><option v-for="s in [0.25, 0.5, 0.75, 1, 1.5, 2]" :key="s" :value="s">{{ s }}×</option></select></label>
    <label><input v-model="playMode" type="checkbox">Play mode (tap to judge)</label>
    <label>Offset <input v-model.number="offsetMs" type="range" min="-200" max="200" step="5"><span class="mono">{{ offsetMs }} ms</span></label>
    <label>Note scale <input v-model.number="scale" type="range" min="0.7" max="1" step="0.01"><span class="mono">{{ scale.toFixed(2) }}×</span></label>
    <label><input v-model="judgement" type="checkbox">Judgement text</label>
  </div>

  <div class="chart-layout">
    <div class="panel gameplay">
      <div class="game-header">
        <div>
          <span class="eyebrow">CYTOID LEVEL / PIXI LIVE RENDER</span>
          <h3>{{ level?.title || 'No level loaded' }}</h3>
        </div>
        <div class="game-stats mono">
          <span v-if="level">{{ level.artist }}</span>
          <span v-if="difficulty">{{ difficulty.name }} · LV {{ difficulty.difficulty }}</span>
        </div>
      </div>
      <div
        class="play-area"
        style="touch-action: none"
        @dragover.prevent
        @drop="onDrop"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <div ref="hostEl" style="position: absolute; inset: 0" />
        <div
          v-if="!level"
          style="position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none"
        >
          <div class="caption" style="text-align: center">
            <p style="font-size: 15px; color: var(--text)">
              Drop a <code>.cytoidlevel</code> here
            </p>
            <p>or pick one below — vector notes render live through Pixi, no sprites involved.</p>
          </div>
        </div>
      </div>
      <input
        class="chart-timeline"
        type="range"
        min="0"
        :max="duration || 1"
        step="0.01"
        :value="time"
        aria-label="Chart time"
        @pointerdown="dragging = true"
        @input="onTimeline"
        @change="dragging = false"
        @pointerup="dragging = false"
      >
      <div class="game-footer mono">
        <span>{{ difficulty?.chart ? `${difficulty.chart.note_list.length} NOTES` : '—' }}</span>
        <span v-if="stats">MAX COMBO {{ stats.maxCombo }} · P{{ stats.perfect }} G{{ stats.great }} Go{{ stats.good }} B{{ stats.bad }} M{{ stats.miss }}</span>
        <span v-else>{{ playing ? 'PLAYING' : time > 0 ? 'PAUSED' : 'IDLE' }}</span>
        <span>{{ playMode ? 'PLAY MODE' : 'AUTOPLAY' }} · LIVE VECTOR</span>
      </div>
    </div>

    <aside class="panel level-card">
      <h3>Level</h3>
      <button class="pick-btn demo-btn" :disabled="loading" @click="loadDemo">
        {{ loading && isDemo ? 'Loading…' : 'Load demo level' }}
      </button>
      <p class="caption credit">
        夢色パレード (w/ 桃箱 & miko) — Yunomi · charter Teages ·
        <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="license noopener">CC BY-NC-SA 3.0</a>
      </p>
      <label class="file-pick">
        <input type="file" accept=".cytoidlevel,.zip" @change="load(($event.target as HTMLInputElement).files?.[0]!)">
        <span class="pick-btn">{{ loading && !isDemo ? 'Loading…' : 'Open .cytoidlevel…' }}</span>
      </label>
      <p class="caption hint">
        Charts are parsed and scheduled locally; the audio track decodes through WebAudio.
      </p>
      <div v-if="level" class="diff-list">
        <button
          v-for="(d, i) in level.difficulties"
          :key="i"
          class="diff-row"
          :class="{ active: i === current }"
          :disabled="d.chart == null"
          @click="current = i"
        >
          <span class="mono type">{{ d.type.toUpperCase() }}</span>
          <span class="name">{{ d.name }} · LV {{ d.difficulty }}</span>
          <span v-if="d.chart == null" class="muted">C1</span>
        </button>
      </div>
      <p v-if="error" class="caption error">
        {{ error }}
      </p>
    </aside>
  </div>
</template>

<style scoped>
.chart-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; align-items: start; }
.gameplay { overflow: hidden; display: flex; flex-direction: column; gap: 12px; }
.game-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 20px 24px; }
.game-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 0 24px 20px; font-size: 10px; color: var(--muted); }
.game-header h3 { margin: 8px 0 0; font-size: 17px; font-weight: 500; }
.game-stats { display: flex; gap: 20px; font-size: 11px; color: var(--muted); }
.play-area { position: relative; width: 100%; aspect-ratio: 16 / 9; background: var(--stage); border-block: 1px solid var(--border); overflow: hidden; }
.chart-timeline { width: calc(100% - 48px); margin: 0 24px; }
@media(max-width: 1000px) { .chart-layout { grid-template-columns: 1fr; } }
.level-card { padding: 24px; }
.level-card h3 { margin: 0 0 14px; font-weight: 500; font-size: 17px; }
.file-pick { display: block; cursor: pointer; }
.file-pick input { display: none; }
.pick-btn { display: block; border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; text-align: center; font-size: 12px; color: var(--text); transition: border-color 0.15s; }
.pick-btn:hover { border-color: var(--accent); }
.demo-btn { width: 100%; border: 1px solid var(--border); background: transparent; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: var(--accent); cursor: pointer; }
.demo-btn:hover { border-color: var(--accent); }
.demo-btn:disabled { opacity: 0.5; cursor: default; }
.credit { margin: 8px 0 16px; font-size: 10px; line-height: 1.6; }
.credit a { color: var(--muted); text-decoration: underline; }
.hint { margin: 12px 0 16px; }
.diff-list { display: flex; flex-direction: column; gap: 8px; }
.diff-row { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: 1px solid var(--border); background: transparent; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: var(--text); cursor: pointer; }
.diff-row:disabled { opacity: 0.45; cursor: default; }
.diff-row.active { border-color: var(--accent); color: var(--accent); }
.diff-row .type { font-size: 10px; letter-spacing: 1px; }
.diff-row .name { flex: 1; }
.error { color: #d25669; margin: 12px 0 0; }
</style>
