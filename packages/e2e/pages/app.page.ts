import {
  expect,
  type Locator,
  type Page,
  type Response,
} from '@playwright/test';

export class AppPage {
  readonly page: Page;
  readonly main: Locator;
  readonly header: Locator;
  readonly resourceCards: Locator;
  readonly scroller: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.locator('main');
    this.header = page.getByTestId('app-header');
    this.resourceCards = page.getByTestId('resource-cards');
    this.scroller = page.getByTestId('scroller');
  }

  trackConsoleErrors(): string[] {
    const errors: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  goto(): Promise<Response | null> {
    return this.page.goto('/');
  }

  expectOnOrigin(appUrl: string): void {
    expect(this.page.url()).toBe(new URL('/', appUrl).href);
  }

  async expectRegisteredRegionsVisible(): Promise<void> {
    await expect(this.main).toBeVisible();
    await expect(this.header).toBeVisible();
    await expect(this.resourceCards).toBeVisible();
    await expect(this.scroller).toBeVisible();
  }
}
