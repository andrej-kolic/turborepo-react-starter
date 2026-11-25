# Playwright E2E runs on the production preview build

- Status: accepted; changed on 2026-11-25 (#213): CI runs the full suite on every bundler, not only on one
- Date: 2026-06-24

## Context

The repo needed a CI regression check for what users see. The agent browser tools check the dev server while coding, and the smoke workflow only proves each bundler's dev server boots. Neither tests the build that ships.

## Decision

- Use Playwright Test (`@playwright/test`) in `packages/e2e/`, against the production preview (`pnpm build:app`, then `pnpm preview:app`), not the dev server.
- CI runs the full E2E suite on all three bundlers, on preview builds in `verify-build.yml`. It took 12 s per job on average, the `@smoke` test 4 s (the last 15 runs on 2026-11-25), too little to justify running fewer tests on some bundlers. `verify-dev.yml` runs the `@smoke` test on all three dev servers.
- Chromium only. Specs assert the registered `data-testid` page regions; user-flow tests use `getByRole` and `getByText`.
- Failure traces come from Playwright's own `retain-on-failure`, not from `@repo/browser-capture`.

## Consequences

- E2E is the CI source of truth for page regions. The agent browser tools check the same regions while coding, but are not a CI check.
- Every new E2E test runs 6 times in CI (3 bundlers × 2 [build profiles](../build-profiles.md)), or 3 times if tagged `@features`.
- E2E is not in the Turbo task graph. It starts its own preview since [0013](0013-build-profiles.md), which also gives the reason.

How to run it: [`docs/template/e2e.md`](../e2e.md).
