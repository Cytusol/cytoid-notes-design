import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Player-core tests live in packages/player; this workspace project
    // currently has no test files (kept so the root glob still matches).
    passWithNoTests: true,
  },
  resolve: {
    alias: [
      // Resolve the library to source so tests never need a prior build
      // (the published entry points at dist/).
      { find: /^@cytoid\/notes$/, replacement: fileURLToPath(new URL('../packages/notes/src/index.ts', import.meta.url)) },
    ],
  },
})
