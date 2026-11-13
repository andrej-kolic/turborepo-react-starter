# Env values are checked when the build starts

- Status: accepted
- Date: 2026-11-13

## Context

`.env` values reached the app unchecked. A missing or misspelled `APP_REACT_*` value built fine and showed up as `undefined` in the running app. The keys were also typed by hand in three places, which could drift from each other and from the `.env` files.

## Decision

- `loadEnvironmentVariables` in `@repo/dev-tools` validates every value against a Zod 4 schema when a bundler config loads, so in all three bundlers a bad env stops the build or dev server, not the running app.
- The schema is strict: an `APP_REACT_*` key it does not list fails too, so a typo cannot pass silently.
- The `import.meta.env` types are generated from the schema (`z.infer`). app-vite turns on Vite's `strictImportMetaEnv`, so a misspelled key is a type error there as well.
- The schema lives in `packages/client-types/env-schema.ts`, beside the `import.meta.env` types it generates. It moves to its own package when the React Native app needs it without the web asset types.
- No `@t3-oss/env-core`: its main value is the server/client split, and this app is frontend-only.

## Consequences

- A new variable goes in three places: a `.env` file, the schema, and `packages/app-core/src/utils/environment.ts`. Steps: [`docs/env.md`](../env.md).
- The running app does not check the values again; it relies on the build check and the generated types.
- `@repo/client-types` is no longer types-only: it has a runtime schema and depends on `zod`, which `@repo/ui` and Storybook now install without bundling it.
- `*.d.ts` files skip the lint rule that prefers `type`, because only an `interface` can extend Vite's and the global types.
