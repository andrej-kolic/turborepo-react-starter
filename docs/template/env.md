# Add an env variable

Never put a secret here: every value ships in the JavaScript. Why the build checks values: [0007](decisions/0007-env-validated-at-build.md).

1. Set `APP_REACT_<NAME>` in [`packages/app-core/.env`](../../packages/app-core/.env), or `.env.staging` / `.env.production` for one environment. In CI, set it in the pipeline.
2. Add it to [`packages/client-types/env-schema.ts`](../../packages/client-types/env-schema.ts), e.g. `APP_REACT_API_URL: z.url()`.
3. Read it in [`packages/app-core/src/utils/environment.ts`](../../packages/app-core/src/utils/environment.ts) as `import.meta.env.APP_REACT_API_URL`, written out in full.
4. Restart the dev server.

A missed step fails the build (`✖ Unrecognized key: "APP_REACT_API_URL"`) or the type check.
