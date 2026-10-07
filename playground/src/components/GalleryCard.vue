<script setup lang="ts">
import type { NoteKind } from '@cytoid/notes'
import type { CanvasFrame } from './StageCanvas.vue'
import { clamp01, clipsOf, createContext, designs, dragLine, drawScene, group, holdBody, KIND_LABEL, longHoldBody, renderNote, tokens } from '@cytoid/notes'
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

/** Scanline recipe shared by every card: 1.5px line, 6px caps, card-wide. */
function drawScanline(ctx: CanvasRenderingContext2D, width: number, scanY: number) {
  ctx.fillStyle = '#e1e5f5'
  ctx.fillRect(-width / 2, scanY - 0.75, width, 1.5)
  ctx.fillRect(-width / 2, scanY - 3, 6, 6)
  ctx.fillRect(width / 2 - 6, scanY - 3, 6, 6)
}

/**
 * Drag kinds tell their story with a three-node chain. The focused node stays
 * horizontally centred: the head card lays the chain out 中右中 (centre → right
 * → centre, a zigzag that doubles back), a child card 左中右 (head left, focus
 * centre, next child right). Every node is judged when the scanline crosses its
 * lane — so the node times fall straight out of the geometry — and the head
 * keeps sliding along the chain after its own hit, its burst left at the
 * trigger point (Cytoid chain-follow).
 */
function paintDragChain(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const up = review.direction === 'up'
  const click = props.kind.startsWith('click-')
  const headKind = click ? 'click-drag-head' : 'drag-head'
  const childKind = click ? 'click-drag-child' : 'drag-child'
  const focusHead = props.kind.endsWith('head')
  const step = up ? -1 : 1
  const near = height / 2
  const nodes = focusHead
    ? [{ x: 0, y: 0 }, { x: width * 0.27, y: step * 42 }, { x: 0, y: step * 84 }]
    : [{ x: -width * 0.27, y: -step * 36 }, { x: 0, y: 0 }, { x: width * 0.27, y: step * 36 }]
  const kinds: NoteKind[] = [headKind, childKind, childKind]
  const hits = nodes.map(n => 1.5 * (near - n.y * (up ? 1 : -1)) / near)
  const clearDur = tokens.time.clear[review.grade]
  const t = elapsed % (hits[2]! + clearDur + 0.35)
  ctx.translate(width / 2, height / 2)
  const base = { palette: palette.value, direction: review.direction, scale: review.scale }
  const headingTo = (a: { x: number, y: number }, b: { x: number, y: number }) => Math.atan2(b.x - a.x, -(b.y - a.y))
  // connections grow toward the next node (arriving ~1s before its judgement,
  // like Cytoid's DragLineElement) and retract behind it after the source is hit
  for (let i = 0; i < 2; i++) {
    const lead = clamp01((t - (hits[i]! - 1.233)) / ((hits[i + 1]! - 0.968) - (hits[i]! - 1.233)))
    const trail = clamp01((t - hits[i]!) / (hits[i + 1]! - hits[i]!))
    const line = dragLine({ x1: nodes[i]!.x, y1: nodes[i]!.y, x2: nodes[i + 1]!.x, y2: nodes[i + 1]!.y, lead, trail }, createContext(headKind, base))
    if (line)
      drawScene(ctx, line)
  }
  const focus = focusHead ? 0 : 1
  const drawNode = (i: number) => {
    const n = nodes[i]!
    const kind = kinds[i]!
    const hit = hits[i]!
    ctx.save()
    ctx.translate(n.x, n.y)
    if (t < hit) {
      // context nodes enter over their own windows; the focus fills the approach
      const win = i === focus ? 1.5 : 1.2
      const p = clamp01((t - (hit - win)) / win)
      if (p > 0)
        drawScene(ctx, renderNote(kind, { phase: 'enter', p }, createContext(kind, { ...base, heading: headingTo(n, nodes[i + 1] ?? n) }), { judgement: false }))
    }
    else if (t - hit <= clearDur) {
      const since = t - hit
      const burst = review.grade === 'miss' ? { phase: 'miss' as const, t: since } : { phase: 'clear' as const, grade: review.grade, t: since }
      drawScene(ctx, renderNote(kind, burst, createContext(kind, base), { judgement: review.judgement }))
    }
    ctx.restore()
  }
  // the head sprite slides along the chain after its hit (a missed head stops
  // it); Cytoid paints earlier chain notes above later ones, so it rides on top
  // of the node it is approaching — only its own trigger burst sits above it
  const follow = t >= hits[0]! && t < hits[2]! && review.grade !== 'miss'
    ? (() => {
        const seg = t < hits[1]! ? 0 : 1
        const a = nodes[seg]!
        const b = nodes[seg + 1]!
        const alpha = (t - hits[seg]!) / (hits[seg + 1]! - hits[seg]!)
        const followKind: NoteKind = click ? 'drag-head' : headKind
        const followCtx = click
          ? { ...createContext(followKind, { ...base, heading: headingTo(a, b) }), palette: palette.value.family('click', review.direction) }
          : createContext(followKind, { ...base, heading: headingTo(a, b) })
        return { x: a.x + (b.x - a.x) * alpha, y: a.y + (b.y - a.y) * alpha, kind: followKind, ctx: followCtx }
      })()
    : null
  drawNode(1)
  drawNode(2)
  if (follow) {
    ctx.save()
    ctx.translate(follow.x, follow.y)
    drawScene(ctx, renderNote(follow.kind, { phase: 'enter', p: 1 }, follow.ctx, { judgement: false }))
    ctx.restore()
  }
  drawNode(0)
  // the scanline sweeps straight through, judging each node as it passes
  const scanY = step * near * (t / 1.5 - 1)
  if (Math.abs(scanY) <= height / 2 + 3)
    drawScanline(ctx, width, scanY)
}

function paint({ ctx, width, height, dt }: CanvasFrame) {
  if (review.playing)
    elapsed += dt * review.speed
  if (props.kind === 'drag-head' || props.kind === 'click-drag-head' || props.kind === 'drag-child' || props.kind === 'click-drag-child') {
    paintDragChain(ctx, width, height)
    return
  }
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
  const onCard = Math.abs(scanY) <= height / 2 + (hold ? 36 : 0)
  if (!state) {
    if (onCard)
      drawScanline(ctx, width, scanY)
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
  if (onCard)
    drawScanline(ctx, width, scanY)
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
