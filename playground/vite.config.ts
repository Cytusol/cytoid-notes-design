import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // Cloudflare Pages serves each deployment at its own subdomain root
  base: '/',
  plugins: [vue()],
  resolve: { alias: { 'cytoid-notes-design': fileURLToPath(new URL('../src/index.ts', import.meta.url)) } },
})
