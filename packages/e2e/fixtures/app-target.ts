/**
 * The `test` and `expect` every E2E test imports, instead of importing them from Playwright.
 *
 * It adds two things to each test: `appTarget`, the URL of the preview under test, and a step that
 * answers every request to Sentry inside the test browser. So no test run sends anything to a real
 * Sentry project, even on a build with your DSN from `.env.local` or on a deployed staging site.
 */

import { test as base } from '@playwright/test';
import type { AppTargets } from '@repo/dev-tools/config/app-port';
import { resolvePreviewAppTarget } from '../lib/resolve-preview-target';
import { SENTRY_ENVELOPE, SENTRY_REPLY } from '../lib/sentry-spans';

type AppTargetFixtures = {
  /** The preview under test: its URL and port, from `TARGET_URL` or the `BUNDLER` app's `previewPort`. */
  appTarget: AppTargets;
  /** Runs in every test without being asked for: answers each request to Sentry with HTTP 200 in the browser. */
  blockSentry: void;
};

/** Playwright's `test` plus `appTarget` and `blockSentry`. Import this in every test, never Playwright's own `test`. */
export const test = base.extend<AppTargetFixtures>({
  // Playwright requires object destructuring for fixture dependencies.
  // eslint-disable-next-line no-empty-pattern -- no upstream fixtures
  appTarget: async ({}, use) => {
    await use(resolvePreviewAppTarget());
  },
  // On the browser context, which still sees requests once the mocked API's service worker runs on the page.
  // `captureSentrySpans` adds its own context route later, and the route added last runs first.
  blockSentry: [
    async ({ context }, use) => {
      await context.route(SENTRY_ENVELOPE, (route) =>
        route.fulfill(SENTRY_REPLY),
      );
      await use();
    },
    { auto: true },
  ],
});

/** Playwright's own `expect`, re-exported so a test imports `test` and `expect` from one place. */
export { expect } from '@playwright/test';
