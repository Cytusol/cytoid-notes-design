<script setup lang="ts">
import { tokens } from 'cytoid-notes-design'
import { computed, onUnmounted, ref, watch } from 'vue'
import ChartView from './views/ChartView.vue'
import FramesView from './views/FramesView.vue'
import GalleryView from './views/GalleryView.vue'
import InspectorView from './views/InspectorView.vue'
import PaletteView from './views/PaletteView.vue'

const tabs = [
  { id: 'gallery', label: 'Gallery', number: '01', title: 'The complete note vocabulary.', description: 'Ten note kinds. Every phase. A space to look closely at the details.', view: GalleryView },
  { id: 'inspector', label: 'Inspector', number: '02', title: 'A closer look at every frame.', description: 'Scrub, step, compare directions, and inspect the geometry of each clip.', view: InspectorView },
  { id: 'chart', label: 'Chart preview', number: '03', title: 'See the designs in motion.', description: 'A looping autoplay chart for reviewing readability, timing, and connections.', view: ChartView },
  { id: 'frames', label: 'Frames', number: '04', title: 'From vectors to delivery.', description: 'Compare the baked sprite library with its live vector counterpart.', view: FramesView },
  { id: 'palette', label: 'Palette', number: '05', title: 'Find your own colour language.', description: 'Tune perceptual hues or bring your Cytoid custom colours. Every preview follows.', view: PaletteView },
] as const
function currentHash() {
  return tabs.some(t => t.id === location.hash.slice(1)) ? location.hash.slice(1) : 'gallery'
}
const active = ref(currentHash())
const selected = computed(() => tabs.find(t => t.id === active.value) || tabs[0])
function hashChanged() {
  active.value = currentHash()
}
window.addEventListener('hashchange', hashChanged)
onUnmounted(() => window.removeEventListener('hashchange', hashChanged))
watch(active, (id) => {
  if (location.hash !== `#${id}`)
    location.hash = id
})
</script>

<template>
  <div class="app" :style="{ '--stage': tokens.stage }">
    <header class="app-header">
      <a class="brand" href="#gallery" aria-label="Cytoid note laboratory home"><span class="brand-symbol"><i /></span><span>CYTOID<span class="brand-sub">NOTE LABORATORY</span></span></a><span class="header-tag">FLAT DESIGN EXPLORATION <span class="version">v01</span></span><span class="live-badge"><i /> SOURCE LIVE</span>
    </header>
    <nav aria-label="Review views">
      <a v-for="tab in tabs" :key="tab.id" :href="`#${tab.id}`" :class="{ active: active === tab.id }" :aria-current="active === tab.id ? 'page' : undefined" @click="active = tab.id"><span class="mono">{{ tab.number }}</span>{{ tab.label }}</a>
    </nav>
    <main>
      <div class="page-heading">
        <div><span class="eyebrow">DESIGN REVIEW / {{ selected.label.toUpperCase() }}</span><h1>{{ selected.title }}</h1><p>{{ selected.description }}</p></div><div class="page-mark mono">
          {{ selected.number }}<span>/ 05</span>
        </div>
      </div><component :is="selected.view" />
    </main>
    <footer><span>CYTOID / FLAT NOTE STUDIES</span><span>Vector scenes · HiDPI Canvas2D · Baked sprite sheets</span></footer>
  </div>
</template>
