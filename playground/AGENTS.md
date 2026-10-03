# Playground

Vue 3 design-review app for Cytoid note visuals. Keep rendering code in the root package unchanged; import the source via the Vite alias. Only type-import the Node-only bake entry. Shared palette and review settings live in `src/composables/`. Canvas components share one RAF scheduler and resize for device pixel ratio. Tabs use URL hashes.

Validate with `pnpm -C playground build`, `pnpm -C playground lint` (includes Vue components), root `pnpm lint`, and root `pnpm typecheck`. Baked assets are generated, ignored files: run root `pnpm bake` to refresh them.
