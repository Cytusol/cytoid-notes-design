<script setup lang="ts">
import type { Clip, Direction, NoteKind, NoteState } from 'cytoid-notes-design'
import type { CanvasFrame } from './StageCanvas.vue'
import { bounds, createContext, drawScene, group, renderNote } from 'cytoid-notes-design'
import { clipMax } from '../composables/clips'
import { palette } from '../composables/usePalette'
import StageCanvas from './StageCanvas.vue'

const props = withDefaults(defineProps<{
  kind: NoteKind
  direction: Direction
  clip?: Clip
  x?: number
  state?: NoteState | null
  scale?: number
  onion?: boolean
  fps?: number
  showBounds?: boolean
}>(), { x: 1, scale: 1, fps: 30 })
function paint({ ctx, width, height }: CanvasFrame) {
  const dc = createContext(props.kind, { palette: palette.value, direction: props.direction, scale: props.scale })
  ctx.translate(width / 2, height / 2)
  if (props.clip && props.onion) {
    const clip = props.clip
    const step = clipMax(clip) / (clip.duration * props.fps)
    for (const offset of [-2, -1, 1, 2]) {
      let x = props.x + offset * step
      x = clip.mode === 'loop' ? ((x % clip.duration) + clip.duration) % clip.duration : Math.max(0, Math.min(clipMax(clip), x))
      drawScene(ctx, group([clip.draw(x, dc)], { opacity: Math.abs(offset) === 1 ? 0.2 : 0.1 }))
    }
  }
  const node = props.clip ? props.clip.draw(props.x, dc) : props.state ? renderNote(props.kind, props.state, dc) : null
  if (!node)
    return
  drawScene(ctx, node)
  if (props.showBounds) {
    const box = bounds(node)
    if (box) {
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#bdc7ff'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.strokeRect(box[0], box[1], box[2] - box[0], box[3] - box[1])
    }
  }
}
</script>

<template>
  <StageCanvas :paint="paint" :label="`${kind}, ${direction}, ${clip?.id || state?.phase || 'empty'}`" />
</template>
