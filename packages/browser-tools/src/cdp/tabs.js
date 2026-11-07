import { connectOverCDP } from './connect.js';
import { findPageAtOrigin } from './pages.js';

/**
 * Open a URL in the visible Chrome window.
 * Reuses an existing tab at the same origin if one is open, otherwise opens a new tab.
 * Brings the tab to front after navigation.
 *
 * @param {string} url
 * @param {{ port?: number, host?: string }} [options]
 * @returns {Promise<{ url: string, navigated: boolean }>}
 */
export async function openUrl(url, options = {}) {
  try {
    new URL(url).origin;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const browser = await connectOverCDP(options.port, options.host);
  try {
    let targetPage = await findPageAtOrigin(browser, url);

    if (!targetPage) {
      const context = browser.contexts()[0];
      if (!context)
        throw new Error('No browser context available. Is Chrome running?');
      targetPage = await context.newPage();
    }

    const navigated = targetPage.url() !== url;
    if (navigated) {
      await targetPage.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
    }

    await targetPage.bringToFront();
    return { url: targetPage.url(), navigated };
  } finally {
    await browser.close().catch(() => {});
  }
}
