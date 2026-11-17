# Playwright E2E

How to run and extend the Playwright regression tests for `@repo/app-core`. Why they run on the preview build: [`decisions/0003-e2e-on-preview-build.md`](decisions/0003-e2e-on-preview-build.md).

## Run locally

```bash
unset TARGET_URL                            # a leftover dev URL would send E2E to the dev server
pnpm --filter @repo/e2e install:browsers    # first run only
BUILD_PROFILE=bare pnpm e2e                 # or: BUILD_PROFILE=features; add --ui or --headed
```

`pnpm e2e` builds the app named by `BUNDLER` in `.env` with that [build profile](build-profiles.md), starts its preview, runs the profile's tests and stops the preview. It fails without `BUILD_PROFILE`, and if a preview of that app is already running: that one may be another profile's build. Extra flags go to Playwright.

No test sends anything to Sentry: `features` builds with a fake DSN, and `packages/e2e/fixtures/app-target.ts` answers every request to Sentry inside the test browser, also on a preview built with your DSN.

## Run against another bundler

```bash
unset TARGET_URL
BUNDLER=app-rspack BUILD_PROFILE=bare pnpm e2e
```

## Run against a preview that is already up

```bash
TARGET_URL=http://localhost:<previewPort> BUILD_PROFILE=bare pnpm e2e
```

With `TARGET_URL`, E2E builds and starts nothing, and tests whatever runs there: pick the profile it was built with. `previewPort` is in `apps/<BUNDLER>/package.json`; URL rules are in [`docs/template/app-url.md`](app-url.md).

## Add a test

1. Assert page regions with `getByTestId`, using values from the [registry](component-validation-contract.md#registry). Use `getByRole` and `getByText` for user flows (clicks, forms, navigation).
2. Put page selectors and actions in a page class under `packages/e2e/pages/` (like `app.page.ts`).
3. Write the spec in `packages/e2e/tests/`, using the `test` fixture from `packages/e2e/fixtures/app-target.ts`; `pnpm lint` fails on a test that imports `test` from Playwright instead, since that test could send to Sentry. A test that needs an optional feature, such as Sentry, gets `{ tag: '@features' }`, as `tests/web-vitals.spec.ts` does; it then runs only on the `features` build.

## Choose the CI bundler

Set the GitHub repo variable `DEFAULT_BUNDLER` to `app-vite`, `app-rspack` or `app-esbuild` (fallback `app-vite`). [`.github/workflows/verify-e2e.yml`](../../.github/workflows/verify-e2e.yml) tests that bundler once per build profile, runs each job in the Playwright container that matches the catalog version, and uploads the report and traces on failure.
