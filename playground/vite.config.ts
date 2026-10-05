import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // relative assets: the same build works at the site root (production) and under
  // pr-preview/<pr>/ on the gh-pages branch
  base: '',
  plugins: [vue()],
  resolve: { alias: { 'cytoid-notes-design': fileURLToPath(new URL('../src/index.ts', import.meta.url)) } },
})
