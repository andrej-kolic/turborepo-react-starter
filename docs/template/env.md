# Add an env variable

Every value ends up in the JavaScript the browser downloads, so never put a secret here. Why the build checks the values: [0007](decisions/0007-env-validated-at-build.md).

1. Set `APP_REACT_<NAME>` in [`packages/app-core/.env`](../../packages/app-core/.env). For one environment only, use `.env.staging` or `.env.production` instead. In CI, set it in the pipeline.
2. Add it to [`packages/client-types/env-schema.ts`](../../packages/client-types/env-schema.ts), for example `APP_REACT_API_URL: z.url()`.
3. Add it to [`packages/app-core/src/utils/environment.ts`](../../packages/app-core/src/utils/environment.ts) as `APP_REACT_API_URL: import.meta.env.APP_REACT_API_URL`. Write the whole name each time: the bundlers replace `import.meta.env.APP_REACT_API_URL` with its value, but `import.meta.env` on its own is `undefined` on esbuild and Rspack.
4. Restart the dev server.

If you miss a step, the build fails (`✖ Unrecognized key: "APP_REACT_API_URL"`) or the type check does.

## Leave code out of builds without a value

To ship code only in builds that set a value, for example a debug panel:

1. Make the value optional in the schema: `APP_REACT_DEBUG_PANEL: z.literal('true').optional()`.
2. Load the code with a dynamic `import()` inside an `if` on the value:

   ```ts
   if (import.meta.env.APP_REACT_DEBUG_PANEL) {
     void import('./debug-panel').then((module) => module.mountDebugPanel());
   }
   ```

   A build without the value then leaves out the whole `debug-panel` module on all three bundlers. A static `import` at the top of the file would still ship any code the module runs when it loads.

3. Read the value straight from `import.meta.env` in the `if`, nowhere else:

   ```ts
   // Right: every bundler leaves the code out
   if (import.meta.env.APP_REACT_DEBUG_PANEL) { … }

   // Wrong: every bundler keeps the code
   if (getEnvironmentVariables().APP_REACT_DEBUG_PANEL) { … }

   // Wrong: esbuild keeps the code
   const showPanel = import.meta.env.APP_REACT_DEBUG_PANEL;
   if (showPanel) { … }
   ```

   Why: the bundlers replace only the exact text `import.meta.env.APP_REACT_DEBUG_PANEL` with the value, so the right way becomes `if (undefined)`, which the minifier removes. In the wrong ways the minifier would have to follow the value through a variable or a function: esbuild never does, and no bundler follows it through `getEnvironmentVariables()`. This also means the value needs no line in `environment.ts`.

## Leave code out of the dev server

To run code only in a production build, for example error reporting, put it inside an `if` on `import.meta.env.PROD`, the same way as above:

```ts
if (import.meta.env.PROD) {
  void import('./error-reporting').then((module) =>
    module.startErrorReporting(),
  );
}
```

`PROD` is `true` in a production build and `false` in the dev server, on all three bundlers, unless the shell sets `NODE_ENV`, as with Vite's own `PROD`. Don't use `MODE` for this: on Vite it is the `BUILD_ENVIRONMENT` in both, and on esbuild it is `N/A`. Why `PROD` works this way: [0008](decisions/0008-prod-follows-node-env.md).

## What CI checks

CI checks the `if` part on every build; that the whole module is left out was checked by hand, not in CI. Every workflow that uses the build action, [`.github/actions/build-project`](../../.github/actions/build-project/action.yaml), runs `pnpm check:env-guards` after the build. It looks at three test lines in [`packages/app-core/src/env-guards.ts`](../../packages/app-core/src/env-guards.ts): the build must keep the ones behind `PROD` and `APP_REACT_GUARD_ON`, which are set, and leave out the one behind `APP_REACT_GUARD_OFF`, which never is. That `PROD` is `false` in the dev server was checked by hand.
