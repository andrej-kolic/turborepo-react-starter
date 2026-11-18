import { environmentSchema } from '@repo/client-types/env-schema';
import { expect, test } from '../fixtures/app-target';
import { AppPage } from '../pages/app.page';

test.describe('app smoke', () => {
  // @smoke: CI runs only this test on the dev servers and on the bundlers other than DEFAULT_BUNDLER.
  test(
    'loads with registered page regions and no console errors',
    { tag: '@smoke' },
    async ({ page, appTarget }) => {
      const appPage = new AppPage(page);
      const consoleErrors = appPage.trackConsoleErrors();

      const response = await appPage.goto();
      expect(response?.status()).toBeLessThan(500);
      appPage.expectOnOrigin(appTarget.url);
      await appPage.expectRegisteredRegionsVisible();

      expect(consoleErrors).toEqual([]);
    },
  );

  test('shows the build version and environment in the header', async ({
    page,
  }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    // Format, not exact values: a TARGET_URL preview may be built from another .env.
    const environments = environmentSchema.shape.BUILD_ENVIRONMENT.options;
    await expect(appPage.header).toContainText(
      new RegExp(String.raw`v\d+\.\d+\.\d+\S* - (${environments.join('|')})`),
    );
  });

  test('shows the error screen on a render error and recovers on Try again', async ({
    page,
  }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    await appPage.throwDemoError();
    await expect(appPage.appError).toContainText('Something went wrong');
    await expect(appPage.resourceCards).toBeHidden();

    await appPage.tryAgain();
    await expect(appPage.appError).toBeHidden();
    await appPage.expectRegisteredRegionsVisible();
  });
});
