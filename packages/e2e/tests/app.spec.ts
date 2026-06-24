import { expect, test } from '@playwright/test';

test.describe('app smoke', () => {
  test('loads with registered page regions and no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);

    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByTestId('app-header')).toBeVisible();
    await expect(page.getByTestId('resource-cards')).toBeVisible();
    await expect(page.getByTestId('scroller')).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });
});
