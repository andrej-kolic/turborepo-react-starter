import { connectOverCDP } from './connect.js';

const DEFAULT_SELECTOR_TIMEOUT_MS = 30_000;
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
 * }} SessionOptions
 */

/**
 * @param {SessionOptions} [options]
 */
function selectorTimeout(options = {}) {
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
  const pageErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`[console.error] ${msg.text()}`);
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
 * Navigate to a URL, run a callback with a console-aware page session, then disconnect.
 *
 * @template T
 * @param {string} url
 * @param {(session: PageSession) => Promise<T>} fn
 * @param {SessionOptions} [options]
 * @returns {Promise<T>}
 */
async function withPageSession(url, fn, options = {}) {
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
async function sessionDiagnostics(session) {
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
async function waitForSelectorOrDiagnostics(session, selector, timeout) {
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
async function settlePage(session, selector, timeout) {
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
async function consoleDiagnostics(session, enabled) {
  if (!enabled || session.pageErrors.length === 0) return undefined;
  return sessionDiagnostics(session);
}

/**
 * @param {Page} page
 * @param {string} expression
 */
async function runPageExpression(page, expression) {
  return page.evaluate(async (expr) => {
    const result = new Function(`return (${expr})`)();
    const value = typeof result === 'function' ? result() : result;
    return value instanceof Promise ? await value : value;
  }, expression);
}

/**
 * @param {Page} page
 * @param {string} selector
 */
async function readLocatorContent(page, selector) {
  const locator = page.locator(selector).first();
  const [text, innerHTML, outerHTML] = await Promise.all([
    locator.textContent(),
    locator.innerHTML(),
    locator.evaluate((el) => el.outerHTML),
  ]);
  return { text: text ?? null, innerHTML, outerHTML };
}

/**
 * @param {PageSession} session
 * @param {string} [selector]
 * @param {'png' | 'jpeg'} type
 * @param {boolean} [fullPage]
 * @param {number} timeout
 */
async function captureScreenshot(session, selector, type, fullPage, timeout) {
  if (selector) {
    await waitForSelector(session.page, selector, timeout);
    return session.page.locator(selector).first().screenshot({ type });
  }
  return session.page.screenshot({ fullPage: fullPage ?? false, type });
}

/**
 * @param {string} url
 * @param {string} expression
 * @param {SessionOptions} [options]
 * @returns {Promise<{ value: unknown, pageErrors: string[] }>}
 */
export async function evaluateScript(url, expression, options = {}) {
  const timeout = selectorTimeout(options);
  return withPageSession(
    url,
    async (session) => {
      if (options.selector) {
        await waitForSelector(session.page, options.selector, timeout);
      } else {
        await settlePage(session, undefined, timeout);
      }
      const value = await runPageExpression(session.page, expression);
      return { value, pageErrors: [...session.pageErrors] };
    },
    options,
  );
}

/**
 * @param {string} url
 * @param {SessionOptions & { fullPage?: boolean, type?: 'png' | 'jpeg' }} [options]
 * @returns {Promise<{ buffer: Buffer, format: 'png' | 'jpeg', pageErrors: string[] }>}
 */
export async function takeScreenshot(url, options = {}) {
  const timeout = selectorTimeout(options);
  const format = options.type ?? 'png';

  return withPageSession(
    url,
    async (session) => {
      if (!options.selector) {
        await settlePage(session, undefined, timeout);
      }
      const buffer = await captureScreenshot(
        session,
        options.selector,
        format,
        options.fullPage,
        timeout,
      );
      return { buffer, format, pageErrors: [...session.pageErrors] };
    },
    options,
  );
}

/**
 * @param {string} url
 * @param {SessionOptions} [options]
 * @returns {Promise<{ consoleOk: boolean, diagnostics?: object }>}
 */
export async function assertNoConsoleErrors(url, options = {}) {
  const timeout = selectorTimeout(options);
  return withPageSession(
    url,
    async (session) => {
      const settled = await settlePage(session, options.selector, timeout);
      if (!settled.ok) {
        return { consoleOk: false, diagnostics: settled.diagnostics };
      }
      const diagnostics = await consoleDiagnostics(session, true);
      return { consoleOk: !diagnostics, diagnostics };
    },
    options,
  );
}

/**
 * @param {string} url
 * @param {string} selector
 * @param {SessionOptions & { noConsoleErrors?: boolean }} [options]
 * @returns {Promise<{ found: boolean, consoleOk?: boolean, diagnostics?: object }>}
 */
export async function assertSelectorExists(url, selector, options = {}) {
  const timeout = selectorTimeout(options);
  return withPageSession(
    url,
    async (session) => {
      const wait = await waitForSelectorOrDiagnostics(
        session,
        selector,
        timeout,
      );
      if (!wait.ok) {
        return { found: false, diagnostics: wait.diagnostics };
      }

      const diagnostics = await consoleDiagnostics(
        session,
        options.noConsoleErrors,
      );
      if (diagnostics) {
        return { found: true, consoleOk: false, diagnostics };
      }
      return {
        found: true,
        consoleOk: options.noConsoleErrors ? true : undefined,
      };
    },
    options,
  );
}

/**
 * @param {string} url
 * @param {string} selector
 * @param {string} text
 * @param {SessionOptions & { noConsoleErrors?: boolean }} [options]
 * @returns {Promise<{ selectorFound: boolean, textFound: boolean, consoleOk?: boolean, diagnostics?: object }>}
 */
export async function assertTextVisible(url, selector, text, options = {}) {
  const timeout = selectorTimeout(options);
  return withPageSession(
    url,
    async (session) => {
      const wait = await waitForSelectorOrDiagnostics(
        session,
        selector,
        timeout,
      );
      if (!wait.ok) {
        return {
          selectorFound: false,
          textFound: false,
          diagnostics: wait.diagnostics,
        };
      }

      const content = await session.page.locator(selector).textContent();
      const textFound = (content ?? '').includes(text);
      const diagnostics = await consoleDiagnostics(
        session,
        options.noConsoleErrors,
      );
      if (diagnostics) {
        return {
          selectorFound: true,
          textFound,
          consoleOk: false,
          diagnostics,
        };
      }
      return {
        selectorFound: true,
        textFound,
        consoleOk: options.noConsoleErrors ? true : undefined,
      };
    },
    options,
  );
}

/**
 * @param {string} url
 * @param {string} selector
 * @param {SessionOptions} [options]
 * @returns {Promise<{ found: boolean, text: string|null, innerHTML: string|null, outerHTML: string|null }>}
 */
export async function readSelector(url, selector, options = {}) {
  const timeout = selectorTimeout(options);
  const empty = { found: false, text: null, innerHTML: null, outerHTML: null };

  return withPageSession(
    url,
    async (session) => {
      const wait = await waitForSelectorOrDiagnostics(
        session,
        selector,
        timeout,
      );
      if (!wait.ok) return empty;

      const content = await readLocatorContent(session.page, selector);
      return { found: true, ...content };
    },
    options,
  );
}
