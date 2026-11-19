# `PROD` follows the bundle's `NODE_ENV`

- Status: accepted
- Date: 2026-11-15

## Context

App code had no flag that is the same on all three bundlers for "this is a production build" (#165). `MODE` is the `BUILD_ENVIRONMENT` on Vite and `N/A` on esbuild, and `import.meta.env.PROD` existed only on Vite.

## Decision

- `import.meta.env.PROD` is in the env schema, and each bundler sets it the way its own tooling defines it:
  - Vite: `process.env.NODE_ENV === 'production'`, the same rule as Vite's own `PROD` ([Vite: Built-in Constants](https://vite.dev/guide/env-and-mode#built-in-constants)).
  - Rspack: `options.mode === 'production'`, the same rule as Rsbuild's ([Rsbuild: import.meta.env.PROD](https://rsbuild.rs/guide/advanced/env-vars#importmetaenvprod)); Rspack sets the bundle's `NODE_ENV` from the same mode.
  - esbuild: `true` in the build config, which also sets `NODE_ENV` to `"production"`, and `false` in the dev config, where esbuild leaves `NODE_ENV` as `"development"` because it does not minify.
- `PROD` and `MODE` stay out of `turbo.json` `globalEnv`: no task reads them from the shell. The `turbo/no-undeclared-env-vars` rule skips them through its `allowList`, which its docs reserve for values with "no effect on build outputs".

## Rejected

- `configEnv.command === 'build'` on Vite: Vite's `DEV` would stop being the opposite of `PROD` whenever the shell sets `NODE_ENV`.
- `MODE`: it names the environment (staging, production), not the kind of build.
- `process.env.NODE_ENV` in app code: browser code would need a `process` type, and full Node types would let any `process.env.X` pass the type check and fail in the browser.

## Consequences

- A shell `NODE_ENV` changes `PROD` on Vite, as it does Vite's own: `NODE_ENV=production` gives a dev server with `PROD` true, `NODE_ENV=development` a build with `PROD` false.
- `pnpm check:env-guards` checks that every build keeps code behind `PROD`; that the dev server drops it was checked by hand.
