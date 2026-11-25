# Playwright E2E

How to run and extend the Playwright regression tests for `@repo/web`. Why they run on the preview build: [`decisions/0003-e2e-on-preview-build.md`](decisions/0003-e2e-on-preview-build.md).

## Run locally

```bash
unset TARGET_URL                            # a leftover dev URL would send E2E to the dev server
pnpm --filter @repo/e2e install:browsers    # first run only
pnpm e2e                                    # the bare profile; add --ui or --headed
BUILD_PROFILE=features pnpm e2e             # the features profile
```

`pnpm e2e` builds the app named by `BUNDLER` in `.env`, starts its preview, runs the tests and stops the preview. `BUILD_PROFILE` sets the [build profile](build-profiles.md) for both the build and the tests; without it, the profile is `bare`. It fails if a preview of that app is already running: that one may be another profile's build. Extra flags go to Playwright.

No test sends anything to Sentry: `features` builds with a fake DSN, and `packages/e2e/fixtures/app-target.ts` answers every request to Sentry inside the test browser, also on a preview built with your DSN.

## Run against another bundler

```bash
unset TARGET_URL
BUNDLER=web-rspack pnpm e2e
```

## Run against a preview that is already up

```bash
TARGET_URL=http://localhost:<previewPort> pnpm e2e
```

With `TARGET_URL`, E2E builds and starts nothing, and tests whatever runs there: for a `features` build, add `BUILD_PROFILE=features`. `previewPort` is in `apps/<BUNDLER>/package.json`; URL rules are in [`docs/template/app-url.md`](app-url.md).

## Add a test

1. Assert page regions with `getByTestId`, using values from the [registry](component-validation-contract.md#registry). Use `getByRole` and `getByText` for user flows (clicks, forms, navigation).
2. Put page selectors and actions in a page class under `packages/e2e/pages/` (like `app.page.ts`).
3. Write the spec in `packages/e2e/tests/`, using the `test` fixture from `packages/e2e/fixtures/app-target.ts`; `pnpm lint` fails on a test that imports `test` from Playwright instead, since that test could send to Sentry. A test that needs an optional feature, such as Sentry, gets `{ tag: '@features' }`, as `tests/web-vitals.spec.ts` does; it then runs only on the `features` build.

## Choose the CI bundler

Set the GitHub repo variable `DEFAULT_BUNDLER` to `web-vite`, `web-rspack` or `web-esbuild` (fallback `web-vite`). [`.github/workflows/verify-build.yml`](../../.github/workflows/verify-build.yml) runs the full suite on that bundler and the `@smoke` test on the other two, once per build profile, in the Playwright container that matches the catalog version, and uploads the report and traces on failure.
