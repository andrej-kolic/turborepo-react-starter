# Playwright E2E runs on the production preview build

- Status: accepted
- Date: 2026-06-24

## Context

The repo needed a CI regression check for what users see. The agent browser tools check the dev server while coding, and the smoke workflow only proves each bundler's dev server boots. Neither tests the build that ships.

## Decision

- Use Playwright Test (`@playwright/test`) in `packages/e2e/`, against the production preview (`pnpm build:app`, then `pnpm preview:app`), not the dev server.
- CI runs E2E on one bundler, set by the `DEFAULT_BUNDLER` repo variable (fallback `app-vite`). The smoke workflow keeps all three bundlers, but only checks that the dev server answers HTTP 200.
- Chromium only. Specs assert the registered `data-testid` page regions; user-flow tests use `getByRole` and `getByText`.
- Failure traces come from Playwright's own `retain-on-failure`, not from `@repo/browser-capture`.

## Consequences

- E2E is the CI source of truth for page regions. The agent browser tools check the same regions while coding, but are not a CI check.
- Bundlers other than `DEFAULT_BUNDLER` get no E2E in CI, only the smoke boot check.
- E2E is not in the Turbo task graph: it needs a running preview first.

How to run it: [`docs/template/e2e.md`](../e2e.md).
