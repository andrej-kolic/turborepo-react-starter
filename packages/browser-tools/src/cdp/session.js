import { connectOverCDP } from './connect.js';
import { attachConsoleListeners } from './console.js';
import { findPageAtOrigin } from './pages.js';
import { BROWSER_BIN } from '../cli/bin-names.js';

export const DEFAULT_SELECTOR_TIMEOUT_MS = 30_000;
const NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * @typedef {import('playwright-core').Page} Page
 * @typedef {{ page: Page, pageErrors: string[] }} PageSession
 * @typedef {{
 *   port?: number,
 *   host?: string,
 *   waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
 *   timeout?: number,
 *   selector?: string,
 *   attach?: boolean,
 * }} SessionOptions
 */

/**
 * @param {SessionOptions} [options]
 */
export function selectorTimeout(options = {}) {
  return options.timeout ?? DEFAULT_SELECTOR_TIMEOUT_MS;
}

/**
 * @param {number} [port]
 * @param {string} [host]
 * @returns {Promise<PageSession & { close(): Promise<void> }>}
 */
async function createPageSession(port, host) {
  const browser = await connectOverCDP(port, host);
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleListener = attachConsoleListeners(page);

  return {
    page,
    pageErrors: consoleListener.pageErrors,
    async close() {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

/**
 * Run a callback against an already-open visible tab at the given origin.
 * Does NOT navigate — preserves the tab's current URL and auth state.
 * Disconnects when done but does not close the page.
 *
 * @template T
 * @param {string} url
 * @param {(session: PageSession) => Promise<T>} fn
 * @param {SessionOptions} [options]
 * @returns {Promise<T>}
 */
export async function withAttachedSession(url, fn, options = {}) {
  const browser = await connectOverCDP(options.port, options.host);
  const page = await findPageAtOrigin(browser, url);

  if (!page) {
    await browser.close().catch(() => {});
    throw new Error(
      `No open tab found for ${new URL(url).origin}. Run: ${BROWSER_BIN} open --url ${url}`,
    );
  }

  const consoleListener = attachConsoleListeners(page);

  try {
    return await fn({ page, pageErrors: consoleListener.pageErrors });
  } finally {
    consoleListener.detach();
    await browser.close().catch(() => {});
  }
}

/**
 * Navigate to a URL, run a callback with a console-aware page session, then disconnect.
 * When options.attach is true, delegates to withAttachedSession instead.
 *
 * @template T
 * @param {string} url
 * @param {(session: PageSession) => Promise<T>} fn
 * @param {SessionOptions} [options]
 * @returns {Promise<T>}
 */
export async function withPageSession(url, fn, options = {}) {
  if (options.attach) {
    return withAttachedSession(url, fn, options);
  }
  const session = await createPageSession(options.port, options.host);
  try {
    await session.page.goto(url, {
      waitUntil: options.waitUntil ?? 'domcontentloaded',
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    return await fn(session);
  } finally {
    await session.close();
  }
}

/**
 * @param {Page} page
 * @param {string[]} pageErrors
 */
async function collectPageDiagnostics(page, pageErrors) {
  try {
    const snapshot = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: (document.body?.innerText ?? '').slice(0, 500),
      hasRoot: !!document.getElementById('root'),
      rootHtml:
        document.getElementById('root')?.innerHTML?.slice(0, 500) ?? null,
      hasViteError: !!document.querySelector('vite-error-overlay'),
    }));
    return { ...snapshot, pageErrors };
  } catch (error) {
    return {
      title: null,
      url: page.url(),
      bodyText: null,
      hasRoot: null,
      rootHtml: null,
      hasViteError: null,
      pageErrors: [...pageErrors, `[diagnostics] ${error.message}`],
    };
  }
}

/**
 * @param {PageSession} session
 */
export async function sessionDiagnostics(session) {
  return collectPageDiagnostics(session.page, session.pageErrors);
}

/**
 * @param {Page} page
 * @param {string} selector
 * @param {number} timeout
 */
async function waitForSelector(page, selector, timeout) {
  await page.waitForSelector(selector, { timeout });
}

/**
 * Wait for a selector or return diagnostics — does not throw.
 *
 * @param {PageSession} session
 * @param {string} selector
 * @param {number} timeout
 * @returns {Promise<{ ok: true } | { ok: false, diagnostics: object }>}
 */
export async function waitForSelectorOrDiagnostics(session, selector, timeout) {
  try {
    await waitForSelector(session.page, selector, timeout);
    return { ok: true };
  } catch {
    return { ok: false, diagnostics: await sessionDiagnostics(session) };
  }
}

/**
 * After navigation, wait for an optional selector or for the load event to settle.
 *
 * @param {PageSession} session
 * @param {string} [selector]
 * @param {number} timeout
 */
export async function settlePage(session, selector, timeout) {
  if (selector) {
    return waitForSelectorOrDiagnostics(session, selector, timeout);
  }
  await session.page
    .waitForLoadState('load', { timeout: NAVIGATION_TIMEOUT_MS })
    .catch(() => {});
  return { ok: true };
}

/**
 * When enabled, return diagnostics if the session collected console errors.
 *
 * @param {PageSession} session
 * @param {boolean} [enabled]
 */
export async function consoleDiagnostics(session, enabled) {
  if (!enabled || session.pageErrors.length === 0) return undefined;
  return sessionDiagnostics(session);
}
