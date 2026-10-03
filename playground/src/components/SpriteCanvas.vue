<script setup lang="ts">
import type { ClipManifest } from '../../../src/bake'
import type { CanvasFrame } from './StageCanvas.vue'
import { ref, watch } from 'vue'
import StageCanvas from './StageCanvas.vue'

const props = defineProps<{
  meta: ClipManifest
  index: number
  url: string
  scale: number
}>()
const error = ref('')
let image: HTMLImageElement | undefined
watch(() => props.url, (url, _, onCleanup) => {
  image = undefined
  error.value = ''
  const next = new Image()
  let active = true
  next.onload = () => {
    if (active)
      image = next
  }
  next.onerror = () => {
    if (active)
      error.value = 'Sprite sheet missing. Run pnpm bake to refresh assets.'
  }
  next.src = url
  onCleanup(() => {
    active = false
  })
}, { immediate: true })
function paint({ ctx, width, height }: CanvasFrame) {
  if (!image)
    return
  const m = props.meta
  const col = props.index % m.sheet.cols
  const row = Math.floor(props.index / m.sheet.cols)
  const w = m.width * props.scale
  const h = m.height * props.scale
  ctx.drawImage(image, col * m.width, row * m.height, m.width, m.height, width / 2 - w * m.anchor[0], height / 2 - h * m.anchor[1], w, h)
}
</script>

<template>
  <StageCanvas :paint="paint" :label="`Baked frame ${index}`" /><p v-if="error" class="sprite-error">
    {{ error }}
  </p>
</template>

<style scoped>
.sprite-error { position: absolute; bottom: 12px; left: 20px; right: 20px; color: #ffb6ad; font-size: 12px; }
</style>
