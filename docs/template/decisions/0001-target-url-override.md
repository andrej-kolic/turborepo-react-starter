# One `TARGET_URL` override for every browser target

- Status: accepted
- Date: 2026-06-24

## Context

The app URL used to be overridden with `APP_URL`, which meant different things in different places. `@repo/dev-tools/config/app-port` applied it in dev mode only, `dev-tools-app-target run` injected the dev URL into it, and E2E repeated the override check because preview mode ignored it. Adopters could not tell whether `APP_URL` pointed at the dev server or the preview.

## Decision

Rename the override to `TARGET_URL` and apply one rule everywhere: when `TARGET_URL` is set it wins in every mode; otherwise the mode (dev or preview) picks the default port from `apps/<BUNDLER>/package.json`. The mode controls the default, never whether the override applies. `TARGET_URL` is never stored in `.env`; ports stay in each app's `package.json`.

## Consequences

- Every consumer (browser tools, capture, E2E, CI) applies the same rule. The browser and capture CLIs read `TARGET_URL` directly (capture then falls back to `CAPTURE_URL`); `dev-tools-app-target` and E2E resolve the `BUNDLER` default.
- A `TARGET_URL` left exported in a shell also overrides preview and E2E. `dev-tools-app-target` and E2E warn when a localhost value differs from the mode default.
- `APP_URL` is no longer read.

Reference: [`docs/template/app-url.md`](../app-url.md).
