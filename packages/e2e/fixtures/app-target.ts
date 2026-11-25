/**
 * Every E2E test imports `test` and `expect` from this file, not from Playwright.
 * This file adds three things to each test:
 * 1. `appTarget`: the URL of the app being tested.
 * 2. `blockSentry`: it stops requests to Sentry, so tests never send anything to a real Sentry project.
 * 3. `network`: a fake todo API, so tests don't need a real one.
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
   * The fake todo API. It is on in every test, and every test starts with the 3 sample todos.
   * If the app sends a request that the fake API doesn't support, the test fails.
   * To start with other todos, call `resetTodos(list)`. To change one endpoint's reply, call `network.use(...)`.
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
      // Tests share these todos, so reset them. Otherwise one test's changes would show up in the next test.
      await resetTodos();

      const unknownRequests: string[] = [];
      const network = defineNetworkFixture({
        context,
        // Without this, the fake API ignores addresses that look like files, such as /todos.json.
        skipAssetRequests: false,
        handlers: IN_APP_MOCK
          ? []
          : [
              ...createHandlers(API_URL),
              // We don't use the library's `onUnhandledFrame: 'error'` because it also blocks the app's own page and files.
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
