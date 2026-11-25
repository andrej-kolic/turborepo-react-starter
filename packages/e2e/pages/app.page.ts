/**
 * Shared helper for the E2E tests that open the app's pages: the home page and the asset imports page.
 *
 * It knows how to find the pages' parts (header, cards, error screens) and how to do what a test needs
 * (open a page, click "Throw error" or "Throw app error", switch the tab away), so each test calls `appPage.throwDemoError()`
 * instead of repeating how to find that button.
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
  readonly aboutPage: Locator;
  readonly routeError: Locator;
  readonly appError: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.locator('main');
    this.header = page.getByTestId('app-header');
    this.resourceCards = page.getByTestId('resource-cards');
    this.scroller = page.getByTestId('scroller');
    this.aboutPage = page.getByTestId('about-page');
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

  /** Opens the asset imports page directly, two levels deep, as a deep link or reload would. */
  gotoAssetImports(): Promise<Response | null> {
    return this.page.goto('/demo/asset-imports');
  }

  expectOnOrigin(appUrl: string): void {
    expect(this.page.url()).toBe(new URL('/', appUrl).href);
  }

  async expectRegisteredRegionsVisible(): Promise<void> {
    await expect(this.main).toBeVisible();
    await expect(this.header).toBeVisible();
    await expect(this.scroller).toBeVisible();
  }

  /**
   * Checks that every way the asset imports page loads an asset worked: each card image has
   * decoded, and the public text file is served as itself, not as the app's index.html fallback.
   */
  async expectAssetsLoaded(): Promise<void> {
    await expect(this.resourceCards).toBeVisible();
    const images = this.resourceCards.locator('img');
    await expect(images).not.toHaveCount(0);
    for (const image of await images.all()) {
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
    }
    const readmeHref = await this.resourceCards
      .getByRole('link', { name: 'Readme' })
      .getAttribute('href');
    const readme = await this.page.request.get(
      new URL(readmeHref ?? '', this.page.url()).href,
    );
    expect(readme.headers()['content-type']).toContain('text/plain');
  }

  async openAboutByLink(): Promise<void> {
    await this.page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'About' })
      .click();
  }

  async throwDemoError(): Promise<void> {
    await this.page.getByRole('button', { name: 'Throw error' }).click();
  }

  async throwAppError(): Promise<void> {
    await this.page.getByRole('button', { name: 'Throw app error' }).click();
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
