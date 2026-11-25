/**
 * This file tests the test setup, not a feature. It tests that:
 * 1. The E2E tests use Playwright's fake API, not the one built into the app.
 * 2. A test fails when the app sends a request that the fake API doesn't support.
 */

import { expect, test } from '../fixtures/app-target';
import { API_URL } from '../lib/api-url';
import { TodosPage } from '../pages/todos.page';

test('shows todos on a build that loads no mock and starts no service worker', async ({
  page,
}) => {
  const mockFiles: string[] = [];
  page.on('request', (request) => {
    if (/msw|mockServiceWorker/i.test(request.url())) {
      mockFiles.push(request.url());
    }
  });

  const todos = new TodosPage(page);
  await todos.goto();
  await expect(todos.titles).toHaveCount(3);

  expect(mockFiles).toEqual([]);
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
});

// `/unknown.json` is here because the library ignores addresses that look like files by default.
for (const path of ['/unknown', '/unknown.json']) {
  test.fail(
    `fails on a request the mock has no handler for: ${path}`,
    async ({ page }) => {
      await page.goto('/');
      // Ignore fetch errors, so that the test can fail only because of the unsupported request.
      await page.evaluate(
        (url) =>
          fetch(url).then(
            () => undefined,
            () => undefined,
          ),
        `${API_URL}${path}`,
      );
    },
  );
}
