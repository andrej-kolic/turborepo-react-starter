# Playwright E2E runs on the production preview build

- Status: accepted
- Date: 2026-06-24

## Context

The repo needed a CI regression check for what users see. The agent browser tools check the dev server while coding, and the smoke workflow only proves each bundler's dev server boots. Neither tests the build that ships.

## Decision

- Use Playwright Test (`@playwright/test`) in `packages/e2e/`, against the production preview (`pnpm build:app`, then `pnpm preview:app`), not the dev server.
- CI runs the full E2E suite on one bundler, set by the `DEFAULT_BUNDLER` repo variable (fallback `web-vite`), and the `@smoke` test on the other two, all on preview builds in `verify-build.yml`. `verify-dev.yml` runs the `@smoke` test on all three dev servers.
- Chromium only. Specs assert the registered `data-testid` page regions; user-flow tests use `getByRole` and `getByText`.
- Failure traces come from Playwright's own `retain-on-failure`, not from `@repo/browser-capture`.

## Consequences

- E2E is the CI source of truth for page regions. The agent browser tools check the same regions while coding, but are not a CI check.
- Bundlers other than `DEFAULT_BUNDLER` get only the `@smoke` test in CI.
- E2E is not in the Turbo task graph. It starts its own preview since [0013](0013-build-profiles.md), which also gives the reason.

How to run it: [`docs/template/e2e.md`](../e2e.md).
