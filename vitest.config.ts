import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Two projects: package unit tests (root `test/`) and the playground player
// core (`playground/test/`). The playground project aliases the workspace
// package to source, same as the playground vite config.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'package',
          include: ['test/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'playground',
          root: fileURLToPath(new URL('./playground', import.meta.url)),
          include: ['test/**/*.test.ts'],
          environment: 'node',
        },
        resolve: {
          alias: {
            'cytoid-notes-design': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
          },
        },
      },
    ],
  },
})
