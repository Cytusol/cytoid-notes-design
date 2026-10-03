<script setup lang="ts">
import type { Direction, Family, PaletteOptions } from 'cytoid-notes-design'
import { FAMILIES, FAMILY_LABEL, hexToOklch, KIND_LABEL, NOTE_KINDS, tokens } from 'cytoid-notes-design'
import { computed, ref } from 'vue'
import NoteCanvas from '../components/NoteCanvas.vue'
import { palette, paletteOptions, storageError, validatePalette } from '../composables/usePalette'

const directions: Direction[] = ['up', 'down']
const status = ref('')
const hasError = ref(false)
const json = ref('')
const exported = computed(() => `${JSON.stringify(paletteOptions.value, null, 2)}\n`)
const classic: PaletteOptions = { families: Object.fromEntries(FAMILIES.map(f => [f, f === 'long-hold' ? { up: '#F2C85A', down: '#F2C85A' } : ['drag', 'click-drag', 'drop-drag'].includes(f) ? { up: '#39E59E', down: '#39E59E' } : { up: '#35A7FF', down: '#FF5964' }])) }
const presets: {
  name: string
  value: PaletteOptions
  colors: string[]
}[] = [
  { name: 'Default', value: {}, colors: ['#35a7ff', '#ff5964', '#39e59e'] },
  { name: 'Cytoid classic', value: classic, colors: ['#35A7FF', '#FF5964', '#F2C85A'] },
  { name: 'Monochrome', value: { saturation: 0 }, colors: ['#a5a5a5', '#bdbdbd', '#d0d0d0'] },
  { name: 'Orchid', value: { hueShift: 45, saturation: 0.8 }, colors: ['#b390e5', '#e8ab70', '#79c4b1'] },
  { name: 'Lagoon', value: { hueShift: -35, saturation: 0.75, ring: '#E3F6F0' }, colors: ['#68b8be', '#dc90b8', '#b0c875'] },
]
function preset(value: PaletteOptions) {
  paletteOptions.value = structuredClone(value)
  status.value = 'Palette applied to all live previews.'
  hasError.value = false
}
function inputFor(family: Family, dir: Direction) {
  return paletteOptions.value.families?.[family]?.[dir] ?? tokens.hue[family][dir]
}
function hue(family: Family, dir: Direction) {
  const value = inputFor(family, dir)
  return typeof value === 'number' ? ((value % 360) + 360) % 360 : Math.round(hexToOklch(value).h)
}
function setColor(family: Family, dir: Direction, value: number | string | undefined) {
  const families = paletteOptions.value.families ??= {}
  const pair = families[family] ??= {}
  if (value === undefined)
    delete pair[dir]
  else
    pair[dir] = value
}
function hexChange(family: Family, dir: Direction, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()
  if (!value) {
    setColor(family, dir, undefined)
    return
  }
  if (!/^#[\da-f]{6}$/i.test(value)) {
    status.value = 'Use a six-digit colour, e.g. #35A7FF, or clear the field to restore the default.'
    hasError.value = true
    input.value = typeof inputFor(family, dir) === 'string' ? String(inputFor(family, dir)) : ''
    return
  }
  setColor(family, dir, value)
  status.value = 'Raw hex applied. Global hue shift affects numeric hues only.'
  hasError.value = false
}
function ringChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (/^#[\da-f]{6}$/i.test(input.value)) {
    paletteOptions.value.ring = input.value
    hasError.value = false
  }
  else {
    input.value = paletteOptions.value.ring || tokens.ring
    status.value = 'Ring colour must be #rrggbb.'
    hasError.value = true
  }
}
function importJSON(text: string) {
  try {
    paletteOptions.value = validatePalette(JSON.parse(text))
    status.value = 'Palette imported.'
    hasError.value = false
  }
  catch (cause) {
    status.value = cause instanceof Error ? cause.message : 'Invalid JSON.'
    hasError.value = true
  }
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  try {
    json.value = await file.text()
    importJSON(json.value)
  }
  catch {
    status.value = 'Unable to read this file.'
    hasError.value = true
  }
  input.value = ''
}
async function copy() {
  try {
    await navigator.clipboard.writeText(exported.value)
    status.value = 'Palette JSON copied.'
    hasError.value = false
  }
  catch {
    json.value = exported.value
    status.value = 'Clipboard unavailable. Copy the JSON from the editor below.'
    hasError.value = true
  }
}
function download() {
  const url = URL.createObjectURL(new Blob([exported.value], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'cytoid-palette.json'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
</script>

<template>
  <div class="palette-layout">
    <div class="palette-editor">
      <section class="panel palette-section">
        <div class="section-heading">
          <h3>Start with a palette</h3><button class="quiet" @click="preset({})">
            ↺ Reset
          </button>
        </div><div class="presets">
          <button v-for="p in presets" :key="p.name" class="preset" @click="preset(p.value)">
            <span class="preset-colors"><i v-for="c in p.colors" :key="c" :style="{ background: c }" /></span>{{ p.name }}
          </button>
        </div>
      </section>
      <section class="panel palette-section">
        <h3>Global adjustments</h3><div class="global-slider">
          <label for="shift">Hue shift <span class="mono">{{ paletteOptions.hueShift || 0 }}°</span></label><input id="shift" v-model.number="paletteOptions.hueShift" class="hue-range" type="range" min="-180" max="180" step="1">
        </div><div class="global-slider">
          <label for="saturation">Saturation <span class="mono">{{ (paletteOptions.saturation ?? 1).toFixed(2) }}×</span></label><input id="saturation" v-model.number="paletteOptions.saturation" type="range" min="0" max="2" step="0.01">
        </div><label class="ring-input">Ring colour <input type="color" :value="paletteOptions.ring || tokens.ring" aria-label="Ring colour picker" @input="ringChange"><input class="hex-input mono" :value="paletteOptions.ring || tokens.ring" aria-label="Ring hex colour" maxlength="7" @change="ringChange"></label><p class="caption">
          OKLCH hues preserve the design's lightness balance. Raw hex preserves your custom colour's lightness and chroma; hue shift leaves hex overrides as entered.
        </p>
      </section>
      <section class="panel palette-section">
        <div class="section-heading">
          <h3>Family colours</h3><span class="eyebrow">UP / DOWN</span>
        </div><div v-for="family in FAMILIES" :key="family" class="family">
          <h4>{{ FAMILY_LABEL[family] }}</h4><div v-for="dir in directions" :key="dir" class="family-direction">
            <span class="dir">{{ dir === 'up' ? '↑' : '↓' }}</span><span class="dot" :style="{ background: palette.family(family, dir).fill }" /><input class="hue-range" type="range" min="0" max="360" step="1" :value="hue(family, dir)" :aria-label="`${family} ${dir} hue`" @input="setColor(family, dir, Number(($event.target as HTMLInputElement).value))"><span class="mono hue-value">{{ hue(family, dir) }}°</span><input class="hex-input mono" :value="typeof inputFor(family, dir) === 'string' ? inputFor(family, dir) : ''" placeholder="#rrggbb" :aria-label="`${family} ${dir} raw hex override`" maxlength="7" @change="hexChange(family, dir, $event)"><button class="reset-family quiet" :aria-label="`Reset ${family} ${dir}`" @click="setColor(family, dir, undefined)">
              ↺
            </button>
          </div>
        </div>
      </section>
      <section class="panel palette-section">
        <div class="section-heading">
          <h3>Palette JSON</h3><div class="actions">
            <button class="quiet" @click="copy">
              Copy
            </button><button @click="download">
              Download
            </button>
          </div>
        </div><p class="caption">
          Bake this palette with <code>pnpm bake --palette cytoid-palette.json</code>. Existing sprite sheets keep their baked colours.
        </p><details><summary>Current PaletteOptions</summary><pre class="mono">{{ exported }}</pre></details><textarea v-model="json" class="mono" rows="6" aria-label="Palette JSON to import" placeholder="Paste PaletteOptions JSON, e.g. {&quot;hueShift&quot;: 20}" /><div class="actions">
          <button class="quiet" @click="importJSON(json)">
            Import JSON
          </button><label class="file-button">Import file<input type="file" accept="application/json,.json" @change="importFile"></label>
        </div>
      </section>
    </div>
    <aside class="panel preview-panel">
      <div class="preview-heading">
        <span class="eyebrow">LIVE PALETTE</span><h3>Every kind, both directions</h3><div class="preview-column-labels">
          <span>UP ↑</span><span>DOWN ↓</span>
        </div>
      </div><div v-for="kind in NOTE_KINDS" :key="kind" class="palette-preview-row">
        <span>{{ KIND_LABEL[kind] }}</span><div v-for="dir in directions" :key="dir">
          <NoteCanvas :kind="kind" :direction="dir" :state="{ phase: 'enter', p: 1 }" :scale="0.42" />
        </div>
      </div>
    </aside>
  </div>
  <p class="palette-status" :class="{ error: hasError }" role="status">
    {{ status || storageError || 'Palette edits are saved on this browser and apply to every live vector view.' }}
  </p>
</template>

<style scoped>
.palette-layout { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 24px; align-items: start; }
.palette-section { padding: 24px; margin-bottom: 18px; }
.palette-section h3 { font-size: 15px; font-weight: 500; margin: 0 0 22px; }
.section-heading { margin: 0 0 20px; } .section-heading h3 { margin: 0; }
.presets { display: flex; flex-wrap: wrap; gap: 10px; } .preset { flex: 1; min-width: 94px; font-size: 11px; padding: 14px 10px; }
.preset-colors { display: flex; gap: 4px; justify-content: center; margin-bottom: 12px; } .preset-colors i { width: 16px; height: 16px; border-radius: 50%; }
.global-slider { margin-bottom: 24px; } .global-slider label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 15px; }
.global-slider input { width: 100%; }
.ring-input { display: flex; align-items: center; gap: 15px; font-size: 12px; }
.family { border-top: 1px solid var(--border); padding: 18px 0; } .family:last-child { padding-bottom: 0; }
.family h4 { font-weight: 500; font-size: 12px; margin: 0 0 14px; }
.family-direction { display: flex; gap: 12px; align-items: center; margin-top: 12px; }
.family-direction input[type=range] { flex: 1; min-width: 70px; }.dir { color: var(--muted); width: 10px; }
.hex-input { width: 88px; font-size: 11px; padding: 8px; } .hue-value { width: 37px; text-align: right; font-size: 11px; color: var(--muted); }
.reset-family { padding: 6px 8px; }
.preview-panel { position: sticky; top: 20px; overflow: hidden; }
.preview-heading { padding: 24px 24px 12px; } .preview-heading h3 { font-size: 15px; font-weight: 500; }
.preview-column-labels { display: grid; grid-template-columns: 1fr 1fr; margin-left: 120px; text-align: center; color: var(--muted); font-size: 9px; letter-spacing: 1px; }
.palette-preview-row { display: grid; grid-template-columns: 135px 1fr 1fr; height: 85px; border-top: 1px solid var(--border); background: var(--stage); align-items: center; }
.palette-preview-row>span { padding-left: 24px; font-size: 11px; color: var(--muted); }
.palette-preview-row>div { height: 85px; min-width: 0; }
textarea { width: 100%; resize: vertical; margin: 14px 0; padding: 14px; font-size: 12px; } details { font-size: 12px; } summary { cursor: pointer; } pre { overflow-x: auto; }
.actions { display: flex; gap: 8px; align-items: center; } .file-button { border: 1px solid var(--border); border-radius: 7px; padding: 9px 13px; font-size: 12px; cursor: pointer; } .file-button input { display: none; }
.palette-status { position: sticky; bottom: 12px; margin: 0; background: #262936ee; border: 1px solid var(--border); border-radius: 8px; padding: 14px 20px; font-size: 12px; box-shadow: 0 8px 25px #0004; }.palette-status.error { color: #ffb6ad; }
@media(max-width: 1000px) { .palette-layout { grid-template-columns: 1fr; } .preview-panel { position: static; } }
</style>
