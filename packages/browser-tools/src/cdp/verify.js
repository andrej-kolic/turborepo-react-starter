import { connectOverCDP } from './connect.js';

/** How long to wait for a selector to appear after navigation (covers SPA hydration). */
const DEFAULT_SELECTOR_TIMEOUT_MS = 30_000;

/**
 * Open a page session and collect browser console errors for diagnostics.
 *
 * @param {number} [port]
 * @param {string} [host]
 */
async function createPageSession(port, host) {
  const browser = await connectOverCDP(port, host);
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      pageErrors.push(`[console.${type}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(`[pageerror] ${error.message}`);
  });

  return {
    page,
    pageErrors,
    async close() {
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

/**
 * Collect page state for failure output — title, #root contents, Vite error overlay, console errors.
 *
 * @param {import('playwright-core').Page} page
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
 * Navigate to a URL and evaluate a JavaScript expression.
 * Disconnects immediately after evaluation.
 *
 * @param {string} url
 * @param {string|Function} script - JS expression or function to evaluate in the page
 * @param {{ port?: number, host?: string }} [options]
 * @returns {Promise<unknown>}
 */
export async function evaluateScript(url, script, { port, host } = {}) {
  const browser = await connectOverCDP(port, host);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    return await page.evaluate(script);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Navigate to a URL and return the full page HTML.
 * Disconnects immediately after reading.
 *
 * @param {string} url
 * @param {{ port?: number, host?: string }} [options]
 * @returns {Promise<string>}
 */
export async function takeSnapshot(url, { port, host } = {}) {
  const browser = await connectOverCDP(port, host);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    return await page.content();
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Assert that a CSS selector matches at least one element on the page.
 * Polls until the selector appears (covers React hydration on first load).
 * Disconnects immediately after the check.
 *
 * @param {string} url
 * @param {string} selector
 * @param {{ port?: number, host?: string, timeout?: number }} [options]
 * @returns {Promise<{ found: boolean, diagnostics?: object }>}
 */
export async function assertSelectorExists(
  url,
  selector,
  { port, host, timeout } = {},
) {
  const selectorTimeout = timeout ?? DEFAULT_SELECTOR_TIMEOUT_MS;
  const session = await createPageSession(port, host);
  try {
    await session.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    try {
      await session.page.waitForSelector(selector, {
        timeout: selectorTimeout,
      });
      return { found: true };
    } catch {
      return {
        found: false,
        diagnostics: await collectPageDiagnostics(
          session.page,
          session.pageErrors,
        ),
      };
    }
  } finally {
    await session.close();
  }
}

/**
 * Assert that a CSS selector matches an element and its text content contains
 * the given string.
 * Polls until the selector appears (covers React hydration on first load).
 * Disconnects immediately after the check.
 *
 * @param {string} url
 * @param {string} selector
 * @param {string} text
 * @param {{ port?: number, host?: string, timeout?: number }} [options]
 * @returns {Promise<{ selectorFound: boolean, textFound: boolean, diagnostics?: object }>}
 */
export async function assertTextVisible(
  url,
  selector,
  text,
  { port, host, timeout } = {},
) {
  const selectorTimeout = timeout ?? DEFAULT_SELECTOR_TIMEOUT_MS;
  const session = await createPageSession(port, host);
  try {
    await session.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    try {
      await session.page.waitForSelector(selector, {
        timeout: selectorTimeout,
      });
    } catch {
      return {
        selectorFound: false,
        textFound: false,
        diagnostics: await collectPageDiagnostics(
          session.page,
          session.pageErrors,
        ),
      };
    }
    const content = await session.page.locator(selector).textContent();
    return {
      selectorFound: true,
      textFound: (content ?? '').includes(text),
    };
  } finally {
    await session.close();
  }
}

/**
 * Navigate to a URL, query a selector, and return text and HTML content.
 * Polls until the selector appears (covers React hydration on first load).
 * Disconnects immediately after reading.
 *
 * @param {string} url
 * @param {string} selector
 * @param {{ port?: number, host?: string, timeout?: number }} [options]
 * @returns {Promise<{ found: boolean, text: string|null, innerHTML: string|null, outerHTML: string|null }>}
 */
export async function readSelector(
  url,
  selector,
  { port, host, timeout } = {},
) {
  const selectorTimeout = timeout ?? DEFAULT_SELECTOR_TIMEOUT_MS;
  const session = await createPageSession(port, host);
  try {
    await session.page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    try {
      await session.page.waitForSelector(selector, {
        timeout: selectorTimeout,
      });
    } catch {
      return { found: false, text: null, innerHTML: null, outerHTML: null };
    }
    const locator = session.page.locator(selector).first();
    const [text, innerHTML, outerHTML] = await Promise.all([
      locator.textContent(),
      locator.innerHTML(),
      locator.evaluate((el) => el.outerHTML),
    ]);
    return { found: true, text: text ?? null, innerHTML, outerHTML };
  } finally {
    await session.close();
  }
}
