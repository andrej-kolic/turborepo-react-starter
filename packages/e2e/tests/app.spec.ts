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
});
