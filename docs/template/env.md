# Add an env variable

Every value ends up in the JavaScript the browser downloads, so never put a secret here. Why the build checks the values: [0007](decisions/0007-env-validated-at-build.md).

1. Set `APP_REACT_<NAME>` in [`packages/web/.env`](../../packages/web/.env). For one environment only, use `.env.development`, `.env.staging` or `.env.production` instead; for the dev server only, `.env.dev-server`. In CI, set it in the pipeline.
2. Add it to [`packages/client-types/env-schema.ts`](../../packages/client-types/env-schema.ts), for example `APP_REACT_HELP_URL: z.url()`.
3. Add it to [`packages/web/src/utils/environment.ts`](../../packages/web/src/utils/environment.ts) as `APP_REACT_HELP_URL: import.meta.env.APP_REACT_HELP_URL`. Write the whole name each time: the bundlers replace `import.meta.env.APP_REACT_HELP_URL` with its value, but `import.meta.env` on its own is `undefined` on esbuild and Rspack.
4. Restart the dev server.

If you miss a step, the build fails (`✖ Unrecognized key: "APP_REACT_HELP_URL"`) or the type check does.

## Which env files load

Three switches decide it:

1. **Stage**, `BUILD_ENVIRONMENT`: which deployment, `development`, `staging` or `production`. Locally it comes from the root `.env`, in CI from each workflow. `MODE` is the same value.
2. **Dev server or build**: `pnpm dev:app` or `pnpm build:app`. In code, `PROD` tells them apart.
3. **Profile**, `BUILD_PROFILE`: which check build, `bare` or `features` ([build-profiles.md](build-profiles.md)).

The files in [`packages/web`](../../packages/web) load in this order, and a later file beats an earlier one. A value exported in the shell or set in CI beats every file.

1. `.env`
2. `.env.<BUILD_ENVIRONMENT>`
3. `.env.dev-server`, in the dev server only
4. `.env.features`, on the `features` profile only

Each file is followed by its `.local` twin (`.env.staging.local`, `.env.dev-server.local`), which git ignores; a run with `BUILD_PROFILE` set skips every twin. So the dev server on `staging` loads `.env` → `.env.local` → `.env.staging` → `.env.staging.local` → `.env.dev-server` → `.env.dev-server.local`.

Put each value in one kind of file, so two never set the same key: per-stage values such as addresses in the stage's file, dev-server defaults such as debug flags in `.env.dev-server`. The one exception is `APP_REACT_ENV_FILE`: every file sets it, so its value names the file that won. To change a dev-server default on your machine, use `.env.dev-server.local`: `.env.local` loads before `.env.dev-server` and loses.

| Run                                                                                                                      |                        `.env`                         | `.env.<stage>` | `.env.dev-server` | `.env.features` | `.local` twins   |
| ------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------: | :------------: | :---------------: | :-------------: | ---------------- |
| You develop (`pnpm dev:app`)                                                                                             |                           ✓                           |       ✓        |         ✓         |                 | read             |
| Local build, deploy from your laptop (`pnpm build:app`, `deploy:aws`, `deploy:netlify`)                                  |                           ✓                           |       ✓        |                   |                 | read             |
| Preview (`pnpm preview:app`): serves the build before it; only `vite preview` runs the loader again, with a build's list |                           ✓                           |       ✓        |                   |                 | as that build    |
| Deploy from CI, with env guards and page split on the deploy build                                                       |                           ✓                           |       ✓        |                   |                 | none exist in CI |
| Check build, `bare` (E2E, size, env guards, page split, perf)                                                            |                           ✓                           |       ✓        |                   |                 | skipped          |
| Check build, `features` (the same checks)                                                                                |                           ✓                           |       ✓        |                   |        ✓        | skipped          |
| Dev server boot check (`verify-dev.yml`, `bare`)                                                                         |                           ✓                           |       ✓        |         ✓         |                 | skipped          |
| Unit tests                                                                                                               | no files: each test sets its values with `vi.stubEnv` |                |                   |                 |                  |

Why it works this way: [0020](decisions/0020-env-file-layers.md).

## Leave code out of builds without a value

To ship code only in builds that set a value, the way error reporting needs `APP_REACT_SENTRY_DSN` ([error-reporting.md](error-reporting.md)):

1. Make the value optional in the schema: `APP_REACT_SENTRY_DSN: z.url().optional()`. The real one also accepts an empty value, which CI passes when the repository variable doesn't exist.
2. Load the code with a dynamic `import()` inside an `if` on the value, as [`packages/web/src/optional-features.ts`](../../packages/web/src/optional-features.ts) does:

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

4. Put a fake value in [`packages/web/.env.features`](../../packages/web/.env.features), one that sends nothing, so the `features` [build profile](build-profiles.md) turns the code on and every check runs on it. `pnpm test` fails until you do.

## The mocked API

`APP_REACT_API_URL` is the todo API's URL, or `"mock"`, which starts the mocked todo API (MSW) in the browser before the app renders: in the dev server and in every build, deploys included. [`packages/web/.env`](../../packages/web/.env) sets it to `"mock"`. A missing or empty value fails the build. Its `if` in [`optional-features.ts`](../../packages/web/src/optional-features.ts) follows the rules above:

```ts
if (import.meta.env.APP_REACT_API_URL === 'mock') {
  try {
    const { createWorker } = await import('@repo/core/mocks/browser');
    await createWorker(apiBaseUrl).start(…);
  } catch (error) { … }
}
```

The apps import that file, so the `await` makes them render only once the mock answers. Every page downloads MSW before it shows. A failed start is logged and the apps render without the mock, so only its pages fail.

Use a real API:

1. The same one for every stage: replace `"mock"` in `.env` with the URL.
2. One per stage: delete the line from `.env` and set the URL in each stage's file. A stage without one then fails its build; with `"mock"` left in `.env`, it would show fake todos.
3. On your machine: set the URL in `.env.local`, or in the stage's twin, such as `.env.staging.local`, when the stage's file sets one.
4. For one build: `APP_REACT_API_URL=https://api.example.com pnpm build:app`.
5. For deploys from GitHub: set the variable `APP_REACT_API_URL` (Settings > Secrets and variables > Actions > Variables). It beats the files; unset or empty, they decide. For one stage, set it on that stage's GitHub environment (Settings > Environments); that beats the repo's variable.

On AWS, the site's `Content-Security-Policy` header lets the page call only its own address and Sentry. With an API URL, add its origin to `connect-src` in [`cloudfront-site.yaml`](../../infra/aws/templates/cloudfront-site.yaml) and deploy the AWS infrastructure (`Deploy: AWS: Infrastructure`), or the browser blocks every todo request.

## Leave code out of the dev server

To run code only in a production build, add `import.meta.env.PROD` to the same `if`. Error reporting does both, so the dev server never reports:

```ts
if (import.meta.env.PROD && import.meta.env.APP_REACT_SENTRY_DSN) { … }
```

`PROD` is `true` in a production build and `false` in the dev server, on all three bundlers, unless the shell sets `NODE_ENV`, as with Vite's own `PROD`. Don't use `MODE` for this: it is the `BUILD_ENVIRONMENT` on all three bundlers, the same in a build and in the dev server. Why `PROD` works this way: [0008](decisions/0008-prod-follows-node-env.md).

## What CI checks

Every workflow that builds through the build action, [`.github/actions/build-project`](../../.github/actions/build-project/action.yaml), runs the Turbo task `check:env-guards` on each app it builds; locally `pnpm check:env-guards` builds every bundler app first, on the `bare` [build profile](build-profiles.md), or on `features` with `BUILD_PROFILE=features`. It checks:

1. **The `if` itself**, with three test lines in [`packages/web/src/env-guards.ts`](../../packages/web/src/env-guards.ts): the build must keep the ones behind `PROD` and `APP_REACT_GUARD_ON`, which are set, and leave out the one behind `APP_REACT_GUARD_OFF`, which never is.
2. **The whole module, for Sentry:** a build ships Sentry's code only with a DSN, and only in a file the app loads through `import()`. A `features` build must ship it.
3. **The whole module, for the mocked API:** MSW's code ships only in a file the app loads through `import()`.

That `PROD` is `false` in the dev server was checked by hand.
