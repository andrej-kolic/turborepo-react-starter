# Env values are checked when the build starts

- Status: accepted
- Date: 2026-11-13

## Context

A missing or misspelled `APP_REACT_*` value built fine and reached the app as `undefined`, and the keys were typed by hand in three places.

## Decision

- `loadEnvironmentVariables` validates every value against a Zod schema when a bundler config loads, so a bad env stops the build in all three bundlers.
- The schema is strict: an `APP_REACT_*` key it does not list fails too.
- `import.meta.env` types are generated from the schema; app-vite turns on Vite's `strictImportMetaEnv`.
- The schema lives in `packages/client-types/env-schema.ts`, beside those types, until the React Native app needs its own package.

## Consequences

- A new variable goes in three places: [`docs/env.md`](../env.md).
- The running app does not check the values again.
- `@repo/client-types` now has runtime code and depends on `zod`.
