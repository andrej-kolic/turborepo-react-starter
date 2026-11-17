/**
 * Checks that no E2E test can send anything to a real Sentry project: the shared test setup in
 * `fixtures/app-target.ts` answers every request to Sentry inside the test browser.
 */

import { expect, test } from '../fixtures/app-target';
import { AppPage } from '../pages/app.page';

// @features: only the features build has a DSN, so only it could send to Sentry; see docs/template/build-profiles.md.
for (const url of [
  'https://o0.ingest.de.sentry.io/api/0/envelope/?sentry_key=0',
  'https://sentry.example.com/api/1/envelope/?sentry_key=0',
]) {
  test(
    `answers requests to Sentry inside the browser, so none reach Sentry: ${new URL(url).host}`,
    { tag: '@features' },
    async ({ page }) => {
      await new AppPage(page).goto();

      const answer = await page.evaluate(async (target) => {
        const response = await fetch(target, { method: 'POST', body: '{}' });
        return { status: response.status, body: await response.text() };
      }, url);

      expect(answer).toEqual({ status: 200, body: '{}' });
    },
  );
}
