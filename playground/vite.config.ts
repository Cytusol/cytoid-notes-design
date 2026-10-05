import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // project Pages URL: https://cytusol.github.io/cytoid-notes-design/
  base: process.env.CI ? '/cytoid-notes-design/' : '/',
  plugins: [vue()],
  resolve: { alias: { 'cytoid-notes-design': fileURLToPath(new URL('../src/index.ts', import.meta.url)) } },
})
