import { environmentSchema } from '@repo/client-types/env-schema';
import { expect, test } from '../fixtures/app-target';
import { AppPage } from '../pages/app.page';

test.describe('app smoke', () => {
  // @smoke: CI runs only this test on the dev servers and on the bundlers other than DEFAULT_BUNDLER.
  test(
    'loads the home page and a deep link with their assets and no console errors',
    { tag: '@smoke' },
    async ({ page, appTarget }) => {
      const appPage = new AppPage(page);
      const consoleErrors = appPage.trackConsoleErrors();

      const response = await appPage.goto();
      expect(response?.status()).toBeLessThan(500);
      appPage.expectOnOrigin(appTarget.url);
      await appPage.expectRegisteredRegionsVisible();

      const deepLink = await appPage.gotoAssetImports();
      expect(deepLink?.status()).toBeLessThan(500);
      await appPage.expectAssetsLoaded();

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

  test('shows the route error screen on a page error and recovers on Try again', async ({
    page,
  }) => {
    const appPage = new AppPage(page);
    await appPage.gotoAssetImports();

    await appPage.throwDemoError();
    await expect(appPage.routeError).toContainText('Something went wrong');
    await expect(appPage.resourceCards).toBeHidden();
    // the layout around the page stays
    await expect(appPage.header).toBeVisible();
    await expect(appPage.appError).toBeHidden();

    await appPage.tryAgain();
    await expect(appPage.routeError).toBeHidden();
    await expect(appPage.resourceCards).toBeVisible();
  });

  test('shows the app error screen on an error outside the router and recovers on Try again', async ({
    page,
  }) => {
    const appPage = new AppPage(page);
    await appPage.goto();

    await appPage.throwAppError();
    await expect(appPage.appError).toContainText('Something went wrong');
    // the whole app is replaced, layout included
    await expect(appPage.header).toBeHidden();

    await appPage.tryAgain();
    await expect(appPage.appError).toBeHidden();
    await appPage.expectRegisteredRegionsVisible();
  });
});
