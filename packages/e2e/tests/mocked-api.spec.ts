/** Checks the mocked API in `fixtures/app-target.ts`: the app under test ships no mock of its own, and a request the mock doesn't know fails the test. */

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

// An address with a file extension too: @msw/playwright skips those unless told otherwise.
for (const path of ['/unknown', '/unknown.json']) {
  test.fail(
    `fails on a request the mock has no handler for: ${path}`,
    async ({ page }) => {
      await page.goto('/');
      // Caught, so only the fixture's check can fail the test.
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
