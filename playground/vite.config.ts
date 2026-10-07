import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  // Cloudflare Pages serves each deployment at its own subdomain root
  base: '/',
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^@cytoid\/notes$/, replacement: fileURLToPath(new URL('../packages/notes/src/index.ts', import.meta.url)) },
      { find: /^@cytoid\/notes\/bake$/, replacement: fileURLToPath(new URL('../packages/notes/src/bake/index.ts', import.meta.url)) },
      { find: /^@cytoid\/notes\/bake\/(.*)$/, replacement: fileURLToPath(new URL('../packages/notes/src/bake/$1', import.meta.url)) },
      { find: /^@cytoid\/player$/, replacement: fileURLToPath(new URL('../packages/player/src/index.ts', import.meta.url)) },
    ],
  },
})
