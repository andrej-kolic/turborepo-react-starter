import { expect, test } from '../fixtures/app-target';
import { AppPage } from '../pages/app.page';

test.describe('app smoke', () => {
  test('loads with registered page regions and no console errors', async ({
    page,
    appTarget,
  }) => {
    const appPage = new AppPage(page);
    const consoleErrors = appPage.trackConsoleErrors();

    const response = await appPage.goto();
    expect(response?.status()).toBeLessThan(500);
    appPage.expectOnOrigin(appTarget.url);
    await appPage.expectRegisteredRegionsVisible();

    expect(consoleErrors).toEqual([]);
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
