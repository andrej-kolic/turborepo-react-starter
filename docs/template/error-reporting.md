# Report errors to Sentry

A production build with `APP_REACT_SENTRY_DSN` set sends React's errors to [Sentry](https://sentry.io): render errors the error boundary catches, the ones it doesn't, and the ones React recovers from. Each event is tagged with its `BUILD_ENVIRONMENT` (`development`, `staging` or `production`), so one Sentry project serves every environment.

The dev server and builds without the DSN, such as a fork of this template, send nothing and ship none of Sentry's code. Sentry's code loads after the app, in its own file. The switch is in [`packages/app-core/src/optional-features.ts`](../../packages/app-core/src/optional-features.ts); the handlers it adds are in [`packages/app-core/src/error-reporting`](../../packages/app-core/src/error-reporting/index.ts). Why it works this way: [0009](decisions/0009-optional-features-gate.md).

## Turn it on

The DSN is the address events go to; Sentry shows it under **Project Settings → Client Keys (DSN)**. It is safe to ship in the browser, but keep it out of the repo, or every fork reports to your project.

1. Locally: put it in `packages/app-core/.env.local`, which git ignores and every `BUILD_ENVIRONMENT` loads:

   ```sh
   APP_REACT_SENTRY_DSN="https://<key>@<org>.ingest.sentry.io/<project>"
   ```

2. In CI: add a GitHub repository variable (not a secret) named `APP_REACT_SENTRY_DSN`. The build and deploy workflows pass it to the build:

   ```sh
   gh variable set APP_REACT_SENTRY_DSN --body "https://<key>@<org>.ingest.sentry.io/<project>"
   ```

3. On AWS: deploy the infrastructure once for each environment, with the `Deploy: AWS: Infrastructure` workflow or `./infra/aws/scripts/deploy.sh infra <environment>`. Until then the site's security headers block requests to Sentry.

4. Build and open the preview (`pnpm build:app`, `pnpm preview:app`). After an error, the page's network requests include one to the host in your DSN: `ingest.sentry.io`, or `ingest.de.sentry.io` for a project in the EU.

To turn it off, remove the value. An empty value counts as unset.

## What CI checks

`pnpm check:env-guards` runs after every build in CI. It fails if a build ships Sentry's code without a DSN, or loads it before the app starts instead of through `import()`.
