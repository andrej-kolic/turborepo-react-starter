# Logic every client shares lives in `@repo/core`

- Status: accepted
- Date: 2026-11-23

## Context

All logic lived in the web app, so a later mobile app, CLI or MCP server could reuse none of it (issue #202). Those clients run on React Native (Metro), Node or both, so shared code can't use React, the DOM, Node's APIs or a bundler's `import.meta.env`.

## Decision

- `packages/core` is plain TypeScript, used from its source like `@repo/web`, with no build step. The todo API, its models, the settings store and the mocked API live there; pages and React hooks stay in `@repo/web`.
- Its tsconfig sets `lib: ["es2022", "webworker"]` and `types: []`: `fetch` type-checks, `window`, `document`, `process` and `fs` don't. An oxlint `no-restricted-globals` rule bans the worker globals Node or React Native lack: `self`, `caches`, `postMessage`, `indexedDB`.
- Anything that differs per client is passed in: every API function takes the base URL first, and `createSettingsStore` takes its storage (`localStorage`, AsyncStorage, a file). `core` never reads `import.meta.env`: Metro doesn't provide it.
- Each response is checked by a Zod DTO schema (the API's JSON format) and turned into a model by a `to…()` function. DTO types are never exported. Models are read-only types from a Zod schema ending in `.readonly()`, changed by plain functions such as `toggleDone`.
- The mocked API's MSW handlers (`@repo/core/mocks/handlers`) have no browser or Node code; `mocks/browser` and `mocks/node` connect them, so tests never load the browser setup.

## Rejected

- Classes for models: a plain read-only object survives `JSON.stringify` and a saved query cache; a class instance loses its methods.
- Reading config from `import.meta.env` in `core`: Metro doesn't provide it.
- A `.transform` on DTO schemas: it runs on every check, and the mock (`@msw/data`) checks each todo as it saves it, so the mock would store and send the app's shape instead of the server's.
- A shared React hooks package: no second React client yet.

## Consequences

- A React Native, CLI or MCP client imports `@repo/core` with its own base URL and storage.
- `core` code that uses a browser or Node API fails `pnpm check:type` or `pnpm lint` in `packages/core`.
- Web imports `@repo/core` with `import()` in a route loader, so `core` and Zod stay out of the scripts every page loads first.
- How to add a feature: [core.md](../core.md).
