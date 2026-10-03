<script setup lang="ts">
import { GRADES } from 'cytoid-notes-design'
import { review } from '../composables/useReview'
</script>

<template>
  <div class="toolbar">
    <label>Direction <select v-model="review.direction"><option value="up">↑ Up</option><option value="down">↓ Down</option></select></label>
    <label>Speed <select v-model.number="review.speed"><option v-for="speed in [0.25, 0.5, 0.75, 1, 1.5, 2]" :key="speed" :value="speed">{{ speed }}×</option></select></label>
    <label>Judgement <select v-model="review.grade"><option v-for="grade in GRADES" :key="grade">{{ grade }}</option></select></label>
    <label>Surface <select v-model="review.background"><option value="dark">Dark stage</option><option value="light">Light</option><option value="checker">Checker</option></select></label>
    <label>Note scale <input v-model.number="review.scale" type="range" min="0.35" max="1.2" step="0.05"><span class="mono">{{ review.scale.toFixed(2) }}×</span></label>
    <button class="quiet" @click="review.playing = !review.playing">
      {{ review.playing ? 'Ⅱ Pause' : '▶ Play' }}
    </button>
  </div>
</template>
