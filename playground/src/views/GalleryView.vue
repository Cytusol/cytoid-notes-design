<script setup lang="ts">
import { NOTE_KINDS } from 'cytoid-notes-design'
import GalleryCard from '../components/GalleryCard.vue'
import ReviewControls from '../components/ReviewControls.vue'
</script>

<template>
  <ReviewControls />
  <div class="gallery">
    <GalleryCard v-for="(kind, i) in NOTE_KINDS" :key="kind" :kind="kind" :index="i" />
  </div>
</template>

<style scoped>
.gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
@media (min-width: 1600px) { .gallery { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 950px) { .gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .gallery { grid-template-columns: 1fr; } }
</style>
