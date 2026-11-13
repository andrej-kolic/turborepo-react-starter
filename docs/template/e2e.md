# Playwright E2E

How to run and extend the Playwright regression tests for `@repo/app-core`. Why they run on the preview build: [`decisions/0003-e2e-on-preview-build.md`](decisions/0003-e2e-on-preview-build.md).

## Run locally

```bash
unset TARGET_URL                            # a leftover dev URL would send E2E to the dev server
pnpm build:app
pnpm preview:app &                          # bundler from BUNDLER in .env
pnpm --filter @repo/e2e install:browsers    # first run only
pnpm e2e                                    # or: pnpm e2e --ui, pnpm e2e --headed
kill %1                                     # stop the preview
```

`pnpm e2e` passes extra flags to Playwright.

## Run against another bundler

```bash
unset TARGET_URL
BUNDLER=app-rspack pnpm build:app
BUNDLER=app-rspack pnpm preview:app &
BUNDLER=app-rspack pnpm e2e
```

## Run against a preview that is already up

```bash
TARGET_URL=http://localhost:<previewPort> pnpm e2e
```

`previewPort` is in `apps/<BUNDLER>/package.json`; URL rules are in [`docs/template/app-url.md`](app-url.md).

## Add a test

1. Assert page regions with `getByTestId`, using values from the [registry](component-validation-contract.md#registry). Use `getByRole` and `getByText` for user flows (clicks, forms, navigation).
2. Put page selectors and actions in a page class under `packages/e2e/pages/` (like `app.page.ts`).
3. Write the spec in `packages/e2e/tests/`, using the `test` fixture from `packages/e2e/fixtures/app-target.ts`.

## Choose the CI bundler

Set the GitHub repo variable `DEFAULT_BUNDLER` to `app-vite`, `app-rspack` or `app-esbuild` (fallback `app-vite`). [`.github/workflows/verify-e2e.yml`](../../.github/workflows/verify-e2e.yml) builds that bundler, runs the job in the Playwright container that matches the catalog version, and uploads the report and traces on failure.
