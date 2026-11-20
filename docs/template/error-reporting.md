# Report errors to Sentry

A build with `APP_REACT_SENTRY_DSN` set sends React's errors to [Sentry](https://sentry.io): render errors the error boundary catches, the ones it doesn't, and the ones React recovers from. Each event is tagged with its `BUILD_ENVIRONMENT` (`development`, `staging` or `production`), so one Sentry project serves every environment.

Sentry's code loads after the app, in its own file. The switch is in [`packages/web/src/optional-features.ts`](../../packages/web/src/optional-features.ts); the handlers it adds are in [`packages/web/src/error-reporting`](../../packages/web/src/error-reporting/index.ts). Why it works this way: [0009](decisions/0009-optional-features-gate.md).

## Which builds include Sentry's code

|                            | DSN set | DSN unset or empty |
| -------------------------- | ------- | ------------------ |
| Dev server                 | no      | no                 |
| Build (preview and deploy) | yes     | no                 |

`BUILD_ENVIRONMENT`, building locally or in CI, and the bundler don't change this. A fork has no DSN, so it ships none.

## Turn it on

The DSN is the address events go to; Sentry shows it under **Project Settings → Client Keys (DSN)**. It is safe to ship in the browser, but keep it out of the repo, or every fork reports to your project.

1. Locally: put it in `packages/web/.env.local`, which git ignores and every `BUILD_ENVIRONMENT` loads:

   ```sh
   APP_REACT_SENTRY_DSN="https://<key>@<org>.ingest.sentry.io/<project>"
   ```

   Checks and E2E tests never load it: they run on a [build profile](build-profiles.md), which skips `.local` files.

2. In CI: add a GitHub repository variable (not a secret) named `APP_REACT_SENTRY_DSN`. The deploy workflows pass it to the build; the check workflows don't, they run on build profiles:

   ```sh
   gh variable set APP_REACT_SENTRY_DSN --body "https://<key>@<org>.ingest.sentry.io/<project>"
   ```

3. Where you deploy: if the site sends a `Content-Security-Policy` header, its `connect-src` must allow the host in your DSN, or the browser blocks every request to Sentry. Of the deploys in this repo, only AWS sends one; Netlify's [`_headers`](../../infra/netlify/_headers) has none. AWS allows `https://*.sentry.io` ([`cloudfront-site.yaml`](../../infra/aws/templates/cloudfront-site.yaml)); for a self-hosted Sentry, add its host there. Deploy the AWS infrastructure once for each environment, with the `Deploy: AWS: Infrastructure` workflow or `./infra/aws/scripts/deploy.sh infra <environment>`; until then the old header blocks Sentry.

4. Build and open the preview (`pnpm build:app`, `pnpm preview:app`). After an error, the page's network requests include one to the host in your DSN: `ingest.sentry.io`, or `ingest.de.sentry.io` for a project in the EU.

To turn it off, remove the value.

## Readable stack traces

Every production build writes source maps (`.map` files) without linking them from the JS, so a browser never asks for them. Before anything is published, both deploy scripts (`infra/aws/scripts/deploy.sh`, `infra/netlify/tools/deploy-netlify.sh`) run `dev-tools-sentry-sourcemaps`: it uploads the maps to Sentry with `sentry-cli`, then deletes every `.map` from `dist/`. Sentry then shows the original file and line for each error. Why `sentry-cli` and not the bundler plugins: [0011](decisions/0011-source-maps-with-sentry-cli.md).

| Bundler     | Setting                                                |
| ----------- | ------------------------------------------------------ |
| web-vite    | `build.sourcemap: 'hidden'`                            |
| web-rspack  | `devtool: 'hidden-source-map'`, production builds only |
| web-esbuild | `sourcemap: 'external'`                                |

The upload needs a Sentry auth token, org slug and project slug. Without all three (a fork), it skips the upload with a warning and still deletes the maps.

1. Locally: `sentry-cli login` writes them to `~/.sentryclirc`; or set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`.

2. In CI: a repository secret `SENTRY_AUTH_TOKEN` and repository variables `SENTRY_ORG` and `SENTRY_PROJECT`. Only the deploy workflows get them:

   ```sh
   gh secret set SENTRY_AUTH_TOKEN
   gh variable set SENTRY_ORG --body "<org slug>"
   gh variable set SENTRY_PROJECT --body "<project slug>"
   ```

Errors are filed under the release `turborepo-react-starter@<APP_REACT_VERSION>+<first 7 characters of the commit>`, made by [`release.ts`](../../packages/web/src/error-reporting/release.ts). The build reads the commit from git, locally and in CI alike; a build with uncommitted changes gets the last commit's. The maps are uploaded without a release: Sentry matches them by debug ID.

If the upload fails, for example while Sentry is down or the `sentry-cli` binary isn't installed, the deploy goes ahead with a warning, as with Sentry's bundler plugins; that deploy's errors stay minified in Sentry. The deploy stops before publishing anything only if a `.map` is left in `dist/`.

## Web Vitals

A build with a DSN also sends three measurements of each visit to Sentry, under **Insights → Frontend → Web Vitals**: LCP (how fast the main content shows), CLS (how much the layout jumps) and INP (how fast the page responds to a click or key press). Each page view is named after its route (`/`, `/about`, `/users/$id`), so the pages table has one row per page; a URL that matches no route is named `Pageload`. Why this setup: [0012](decisions/0012-web-vitals-with-browser-tracing.md).

Only a share of visits report: `APP_REACT_SENTRY_TRACES_SAMPLE_RATE`, from 0 to 1, default 0.1. It is not a secret, so set it in [`packages/web/.env`](../../packages/web/.env), or `.env.production` for one environment; an empty value counts as unset. `0` turns Web Vitals off and keeps error reporting.

```sh
APP_REACT_SENTRY_TRACES_SAMPLE_RATE=0.25
```

The browser sends CLS and INP only when the page is hidden, for example when the visitor switches tabs or closes it, and LCP after the first click or key press. Sentry also records the timing of the app's `fetch` and XHR requests, and adds its `sentry-trace` and `baggage` headers to requests to the app's own origin.

## Visitor data

Events carry no IP address: [`sentry.ts`](../../packages/web/src/error-reporting/sentry.ts) sets `dataCollection: { userInfo: false }`, where Sentry's SDK 11 sends it by default. Sentry still looks up the visitor's city and country from the IP address of the connection each event arrives on, and stores them with the event; the IP itself is dropped. To drop those too, add a rule in Sentry under **Project Settings → Security & Privacy → Advanced Data Scrubbing**: remove anything from `$user.geo.**` ([Sentry's docs](https://docs.sentry.io/security-legal-pii/scrubbing/server-side-scrubbing/)).

## What CI checks

`pnpm check:env-guards` runs after every build in CI. It fails if a build ships Sentry's code without a DSN, loads it before the app starts instead of through `import()`, or links a source map from its JS. On the `features` [build profile](build-profiles.md), which has a fake DSN, it also fails if Sentry's code is missing, and so does `pnpm check:size`.

The `Verify: Build` workflow also tests the `DEFAULT_BUNDLER` app's `features` build and checks in Chromium that LCP, CLS and INP are sent, named after the page; the test answers Sentry's requests itself. How to run it locally: `BUILD_PROFILE=features pnpm e2e` ([e2e.md](e2e.md#run-locally)).
