# Add an env variable

Every value ends up in the JavaScript the browser downloads, so never put a secret here. Why the build checks the values: [0007](decisions/0007-env-validated-at-build.md).

1. Set `APP_REACT_<NAME>` in [`packages/app-core/.env`](../../packages/app-core/.env). For one environment only, use `.env.staging` or `.env.production` instead. In CI, set it in the pipeline.
2. Add it to [`packages/client-types/env-schema.ts`](../../packages/client-types/env-schema.ts), for example `APP_REACT_API_URL: z.url()`.
3. Add it to [`packages/app-core/src/utils/environment.ts`](../../packages/app-core/src/utils/environment.ts) as `APP_REACT_API_URL: import.meta.env.APP_REACT_API_URL`. Write the whole name each time: the bundlers replace `import.meta.env.APP_REACT_API_URL` with its value, but `import.meta.env` on its own is `undefined` on esbuild and Rspack.
4. Restart the dev server.

If you miss a step, the build fails (`✖ Unrecognized key: "APP_REACT_API_URL"`) or the type check does.

## Leave code out of builds without a value

To ship code only in builds that set a value, the way error reporting needs `APP_REACT_SENTRY_DSN` ([error-reporting.md](error-reporting.md)):

1. Make the value optional in the schema: `APP_REACT_SENTRY_DSN: z.url().optional()`. The real one also accepts an empty value, which CI passes when the repository variable doesn't exist.
2. Load the code with a dynamic `import()` inside an `if` on the value, as [`packages/app-core/src/optional-features.ts`](../../packages/app-core/src/optional-features.ts) does:

   ```ts
   if (import.meta.env.APP_REACT_SENTRY_DSN) {
     const sentry = import('./error-reporting/sentry');
     …
   }
   ```

   A build without the value then leaves out the whole `sentry` module on all three bundlers. A static `import` at the top of the file would still ship any code the module runs when it loads.

3. Read the value straight from `import.meta.env` in the `if`, nowhere else:

   ```ts
   // Right: every bundler leaves the code out
   if (import.meta.env.APP_REACT_SENTRY_DSN) { … }

   // Wrong: every bundler keeps the code
   if (getEnvironmentVariables().APP_REACT_SENTRY_DSN) { … }

   // Wrong: esbuild may keep the code
   const dsn = import.meta.env.APP_REACT_SENTRY_DSN;
   if (dsn) { … }
   ```

   Why: the bundlers replace only the exact text `import.meta.env.APP_REACT_SENTRY_DSN` with the value, so the right way becomes `if (undefined)`, which the minifier removes. In the wrong ways the minifier would have to follow the value through a variable or a function: esbuild doesn't always, and no bundler follows it through `getEnvironmentVariables()`. This also means the value needs no line in `environment.ts`.

4. Put a fake value in [`packages/app-core/.env.features`](../../packages/app-core/.env.features), one that sends nothing, so the `features` [build profile](build-profiles.md) turns the code on and every check runs on it. `pnpm test` fails until you do.

## Leave code out of the dev server

To run code only in a production build, add `import.meta.env.PROD` to the same `if`. Error reporting does both, so the dev server never reports:

```ts
if (import.meta.env.PROD && import.meta.env.APP_REACT_SENTRY_DSN) { … }
```

`PROD` is `true` in a production build and `false` in the dev server, on all three bundlers, unless the shell sets `NODE_ENV`, as with Vite's own `PROD`. Don't use `MODE` for this: it is the `BUILD_ENVIRONMENT` on all three bundlers, the same in a build and in the dev server. Why `PROD` works this way: [0008](decisions/0008-prod-follows-node-env.md).

## What CI checks

Every workflow that builds through the build action, [`.github/actions/build-project`](../../.github/actions/build-project/action.yaml), runs `pnpm check:env-guards` on each app it builds; locally it builds every bundler app first, with the [build profile](build-profiles.md) you set (`BUILD_PROFILE=bare pnpm check:env-guards`). It checks:

1. **The `if` itself**, with three test lines in [`packages/app-core/src/env-guards.ts`](../../packages/app-core/src/env-guards.ts): the build must keep the ones behind `PROD` and `APP_REACT_GUARD_ON`, which are set, and leave out the one behind `APP_REACT_GUARD_OFF`, which never is.
2. **The whole module, for Sentry:** a build ships Sentry's code only with a DSN, and only in a file the app loads through `import()`. A `features` build must ship it.

That `PROD` is `false` in the dev server was checked by hand.
