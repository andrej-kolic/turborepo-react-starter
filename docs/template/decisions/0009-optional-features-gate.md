# Optional features turn on in `optional-features.ts`

- Status: accepted
- Date: 2026-11-15

## Context

Error reporting (#158) must ship none of Sentry's code in the dev server or in a build without `APP_REACT_SENTRY_DSN`, such as a fork of this template, on all three bundlers. Each bundler leaves code out only when the minifier sees the `if` become `if (undefined)`: [env.md](../env.md#leave-code-out-of-builds-without-a-value).

## Decision

- [`packages/web/src/optional-features.ts`](../../../packages/web/src/optional-features.ts) holds every gate. Each reads its values straight from `import.meta.env` and writes its `import()` inside the `if`:

  ```ts
  if (import.meta.env.PROD && import.meta.env.APP_REACT_SENTRY_DSN) {
    Object.assign(
      rootOptions,
      errorReportingHandlers(import('./error-reporting/sentry')),
    );
  }
  ```

- The feature's own code stays in its folder (`error-reporting/`) and takes the loaded module as an argument, so it never imports the module itself.
- The apps import the result from `@repo/web/optional-features`, an entry of its own in `packages/web/package.json`.

## Rejected

- A shared helper such as `importSentry()` called from the gate: whether esbuild and Rspack still leave the module out through a function call is untested, and the safe failure is not obvious, since a build that ships Sentry still works.
- Shipping Sentry in every build and turning it off at runtime: every fork downloads code it never runs.
- [`env-guards.ts`](../../../packages/web/src/env-guards.ts) as the home: it holds test lines for the build check, not features.
- Re-exporting `rootOptions` from `packages/web/src/index.tsx`: a file that exports components and other values makes React Fast Refresh reload the whole page (`react/only-export-components`).

## Consequences

- A new optional feature adds its own `if` to `optional-features.ts`, in the same shape.
- `pnpm check:env-guards` fails a build that ships Sentry without a DSN, or loads it before the app starts.
- A gate whose code the app must wait for awaits it at the top of the file: the mocked API (#207) starts behind `if (import.meta.env.APP_REACT_API_URL === 'mock')`, and the apps, which import `optional-features.ts`, render only once it answers or fails to start.
