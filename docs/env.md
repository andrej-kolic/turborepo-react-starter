# Add an env variable

How to add an `APP_REACT_*` value that the app reads. Why the build checks it: [`decisions/0007-env-validated-at-build.md`](decisions/0007-env-validated-at-build.md).

Every value ends up in the shipped JavaScript. Never put a secret in one.

## Steps

1. **Set the value** in [`packages/app-core/.env`](../packages/app-core/.env) for every build environment, or in `.env.staging` / `.env.production` for one. Only `APP_REACT_*` variables reach the app. In CI, set it in the pipeline instead: `process.env` wins over `.env` files.
2. **Add it to the schema** in [`packages/client-types/env-schema.ts`](../packages/client-types/env-schema.ts), e.g. `APP_REACT_API_URL: z.url()`. Without this, the build fails with `Unrecognized key`. The schema also gives `import.meta.env.APP_REACT_API_URL` its TypeScript type.
3. **Read it in** [`packages/app-core/src/utils/environment.ts`](../packages/app-core/src/utils/environment.ts) as `APP_REACT_API_URL: import.meta.env.APP_REACT_API_URL`. Write `import.meta.env.<NAME>` in full: Vite replaces only that exact text. The type check fails until this line exists.
4. **Restart the dev server.** It does not reload `.env` changes.

Turbo already passes every `APP_REACT_*` variable to the build (`apps/*/turbo.json`), so no change is needed there.

## Check it

`pnpm build:app` validates the values first. A bad one stops the build and names the variable:

```
Error: Invalid environment variables (env files in …/packages/app-core, BUILD_ENVIRONMENT=staging):
✖ Unrecognized key: "APP_REACT_TYPO"
✖ must be a semver version like 1.2.3 or 1.2.3-rc.1
  → at APP_REACT_VERSION
```
