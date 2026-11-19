/**
 * Shared helper for the E2E tests that open the app's home page.
 *
 * It knows how to find the page's parts (header, cards, error screens) and how to do what a test needs
 * (open the page, click "Throw error", switch the tab away), so each test calls `appPage.throwDemoError()`
 * instead of repeating how to find that button.
 *
 * Used by `tests/app.spec.ts` and `tests/web-vitals.spec.ts`.
 */

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
  readonly routeError: Locator;
  readonly appError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.locator('main');
    this.header = page.getByTestId('app-header');
    this.resourceCards = page.getByTestId('resource-cards');
    this.scroller = page.getByTestId('scroller');
    this.routeError = page.getByTestId('route-error');
    this.appError = page.getByTestId('app-error');
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

  async throwDemoError(): Promise<void> {
    await this.page.getByRole('button', { name: 'Throw error' }).click();
  }

  async tryAgain(): Promise<void> {
    await this.page.getByRole('button', { name: 'Try again' }).click();
  }

  /**
   * Waits until the browser has recorded the first click or key press, and until code that waits for idle time, as web-vitals does, has seen it.
   * The browser records it only after the next paint, so hiding the page right after a click loses it.
   */
  async waitForFirstInputRecorded(): Promise<void> {
    await this.page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          new PerformanceObserver((_list, observer) => {
            observer.disconnect();
            requestIdleCallback(() => resolve());
          }).observe({ type: 'first-input', buffered: true });
        }),
    );
  }

  /** Acts as if the visitor switched tabs; headless Chromium never hides the page by itself. */
  async hide(): Promise<void> {
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }
}
