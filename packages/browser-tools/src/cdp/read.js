import {
  selectorTimeout,
  settlePage,
  waitForSelectorOrDiagnostics,
  withPageSession,
} from './session.js';

/**
 * @typedef {import('./session.js').PageSession} PageSession
 * @typedef {import('./session.js').SessionOptions} SessionOptions
 */

/**
 * @param {import('playwright-core').Page} page
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
 * @param {import('playwright-core').Page} page
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
  const { page } = session;
  if (selector) {
    await page.waitForSelector(selector, { timeout });
    return page.locator(selector).first().screenshot({ type });
  }
  return page.screenshot({ fullPage: fullPage ?? false, type });
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
        await session.page.waitForSelector(options.selector, { timeout });
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
