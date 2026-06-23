import { captureOptions, requireUrl } from '../cli/args.js';
import { connectOverCDP } from '@repo/browser-tools/cdp';
import { getPerformanceMetrics } from '../performance/metrics.js';

const NAVIGATION_TIMEOUT_MS = 30_000;

/**
 * Resolve URL and dispatch to attach or isolated capture implementation.
 *
 * @param {object} params
 * @param {string} params.command
 * @param {string | undefined} params.url
 * @param {Record<string, string | boolean>} params.options
 * @param {(targetUrl: string, durationMs: number) => Promise<unknown>} params.attachedFn
 * @param {(targetUrl: string, durationMs: number) => Promise<unknown>} params.isolatedFn
 * @returns {Promise<unknown>}
 */
export async function runCaptureSession({
  command,
  url,
  options,
  attachedFn,
  isolatedFn,
}) {
  const targetUrl = requireUrl(command, url);
  const { durationMs, attach } = captureOptions(options);
  if (attach) return attachedFn(targetUrl, durationMs);
  return isolatedFn(targetUrl, durationMs);
}

/**
 * Connect over CDP, run a callback, then disconnect without closing open tabs.
 *
 * @template T
 * @param {(browser: import('playwright-core').Browser) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withCdpBrowser(fn) {
  const browser = await connectOverCDP();
  try {
    return await fn(browser);
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Open a fresh browser context for isolated capture, then tear it down.
 *
 * @overload
 * @param {(session: { browser: import('playwright-core').Browser, context: import('playwright-core').BrowserContext }) => Promise<unknown>} fn
 * @returns {Promise<unknown>}
 */
/**
 * @overload
 * @param {import('playwright-core').BrowserContextOptions} contextOptions
 * @param {(session: { browser: import('playwright-core').Browser, context: import('playwright-core').BrowserContext }) => Promise<unknown>} fn
 * @returns {Promise<unknown>}
 */
/**
 * @template T
 * @param {import('playwright-core').BrowserContextOptions | ((session: { browser: import('playwright-core').Browser, context: import('playwright-core').BrowserContext }) => Promise<T>)} contextOptionsOrFn
 * @param {(session: { browser: import('playwright-core').Browser, context: import('playwright-core').BrowserContext }) => Promise<T>} [maybeFn]
 * @returns {Promise<T>}
 */
export async function withIsolatedCapture(contextOptionsOrFn, maybeFn) {
  const contextOptions =
    typeof contextOptionsOrFn === 'function' ? {} : (contextOptionsOrFn ?? {});
  const fn =
    typeof contextOptionsOrFn === 'function' ? contextOptionsOrFn : maybeFn;
  const browser = await connectOverCDP();
  /** @type {import('playwright-core').BrowserContext | undefined} */
  let context;
  try {
    context = await browser.newContext(contextOptions);
    return await fn({ browser, context });
  } finally {
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Read the page URL and title from the live DOM.
 *
 * @param {import('playwright-core').Page} page
 * @returns {Promise<{ url: string | null, title: string | null }>}
 */
export async function getPageDetails(page) {
  return page
    .evaluate(() => ({ url: location.href, title: document.title }))
    .catch(() => ({ url: null, title: null }));
}

/**
 * Collect page details and Web Vitals/CDP metrics for artifact output.
 *
 * @param {import('playwright-core').Page} page
 * @returns {Promise<{ pageDetails: { url: string | null, title: string | null }, performancePayload: object }>}
 */
export async function collectPerformancePayload(page) {
  const cdpSession = await page.context().newCDPSession(page);
  try {
    const [pageDetails, performancePayload] = await Promise.all([
      getPageDetails(page),
      getPerformanceMetrics(page, cdpSession),
    ]);
    return { pageDetails, performancePayload };
  } finally {
    await cdpSession.detach().catch(() => {});
  }
}

/**
 * Navigate to a URL and wait for the load event.
 *
 * @param {import('playwright-core').Page} page
 * @param {string} targetUrl
 * @returns {Promise<void>}
 */
export async function gotoTarget(page, targetUrl) {
  await page.goto(targetUrl, {
    waitUntil: 'load',
    timeout: NAVIGATION_TIMEOUT_MS,
  });
}
