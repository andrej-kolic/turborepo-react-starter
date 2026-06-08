import { connectOverCDP } from './connect.js';

/** Default time to wait for a selector after navigation (SPA hydration). */
const DEFAULT_SELECTOR_TIMEOUT_MS = 30_000;

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
 * Disconnects immediately after the check.
 *
 * @param {string} url
 * @param {string} selector
 * @param {{ port?: number, host?: string, timeout?: number }} [options]
 * @returns {Promise<boolean>} true if selector matches, false otherwise
 */
export async function assertSelectorExists(
  url,
  selector,
  { port, host, timeout } = {},
) {
  const selectorTimeout = timeout ?? DEFAULT_SELECTOR_TIMEOUT_MS;
  const browser = await connectOverCDP(port, host);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    try {
      await page.waitForSelector(selector, { timeout: selectorTimeout });
      return true;
    } catch {
      return false;
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Assert that a CSS selector matches an element and its text content contains
 * the given string.
 * Disconnects immediately after the check.
 *
 * @param {string} url
 * @param {string} selector
 * @param {string} text
 * @param {{ port?: number, host?: string, timeout?: number }} [options]
 * @returns {Promise<{ selectorFound: boolean, textFound: boolean }>}
 */
export async function assertTextVisible(
  url,
  selector,
  text,
  { port, host, timeout } = {},
) {
  const selectorTimeout = timeout ?? DEFAULT_SELECTOR_TIMEOUT_MS;
  const browser = await connectOverCDP(port, host);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    try {
      await page.waitForSelector(selector, { timeout: selectorTimeout });
    } catch {
      return { selectorFound: false, textFound: false };
    }
    const content = await page.locator(selector).textContent();
    return {
      selectorFound: true,
      textFound: (content ?? '').includes(text),
    };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Navigate to a URL, query a selector, and return text and HTML content.
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
  const browser = await connectOverCDP(port, host);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    try {
      await page.waitForSelector(selector, { timeout: selectorTimeout });
    } catch {
      return { found: false, text: null, innerHTML: null, outerHTML: null };
    }
    const locator = page.locator(selector).first();
    const [text, innerHTML, outerHTML] = await Promise.all([
      locator.textContent(),
      locator.innerHTML(),
      locator.evaluate((el) => el.outerHTML),
    ]);
    return { found: true, text: text ?? null, innerHTML, outerHTML };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
