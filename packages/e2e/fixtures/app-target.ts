/**
 * The `test` and `expect` every E2E test imports, instead of importing them from Playwright.
 *
 * It adds three things to each test: `appTarget`, the URL of the preview under test; a step that answers
 * every request to Sentry inside the test browser; and `network`, which answers the todo API's requests
 * with the mock from `@repo/core`. So no test run sends anything to a real Sentry project, even on a build
 * with your DSN from `.env.local` or on a deployed staging site, and none needs a real API.
 */

import { defineNetworkFixture, type NetworkFixture } from '@msw/playwright';
import { expect, test as base } from '@playwright/test';
import { createHandlers, resetTodos } from '@repo/core/mocks/handlers';
import type { AppTargets } from '@repo/dev-tools/config/app-port';
import { http, HttpResponse } from 'msw';
import { API_URL, IN_APP_MOCK } from '../lib/api-url';
import { resolvePreviewAppTarget } from '../lib/resolve-preview-target';
import { SENTRY_ENVELOPE, SENTRY_REPLY } from '../lib/sentry-spans';

type AppTargetFixtures = {
  /** The preview under test: its URL and port, from `TARGET_URL` or the `BUNDLER` app's `previewPort`. */
  appTarget: AppTargets;
  /** Runs in every test without being asked for: answers each request to Sentry with HTTP 200 in the browser. */
  blockSentry: void;
  /**
   * Runs in every test without being asked for: answers requests to `API_URL` from the 3 sample todos, reset before
   * each test. The test fails at its end if the app asked for something the mock has no handler for.
   * Use `network.use(...)` to replace one reply, and `resetTodos(list)` from `@repo/core/mocks/handlers` to set the todos.
   */
  network: NetworkFixture;
};

/** Playwright's `test` plus `appTarget`, `blockSentry` and `network`. Import this in every test, never Playwright's own `test`. */
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
  network: [
    async ({ context }, use) => {
      // The todos live in this worker process, which runs many tests.
      await resetTodos();

      const unknownRequests: string[] = [];
      const network = defineNetworkFixture({
        context,
        // Without this, API addresses that look like a file, such as /todos.json, skip the handlers.
        skipAssetRequests: false,
        handlers: IN_APP_MOCK
          ? []
          : [
              ...createHandlers(API_URL),
              // Not `onUnhandledFrame: 'error'`: it also blocks the app's own page and files.
              http.all(`${API_URL}/*`, ({ request }) => {
                unknownRequests.push(`${request.method} ${request.url}`);
                return new HttpResponse(null, { status: 501 });
              }),
            ],
      });
      await network.enable();
      await use(network);
      await network.disable();

      expect(
        unknownRequests,
        'API requests the mock has no handler for',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

/** Playwright's own `expect`, re-exported so a test imports `test` and `expect` from one place. */
export { expect } from '@playwright/test';
