import { defineConfig } from 'vitest/config'

// Workspace projects are matched by glob; each project picks up its own
// vitest.config.ts and is named after its package.json `name`
// (`@cytoid/notes` + `playground`).
export default defineConfig({
  test: {
    projects: ['packages/*', 'playground'],
  },
})
