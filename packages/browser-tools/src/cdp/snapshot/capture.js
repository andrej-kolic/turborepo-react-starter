/**
 * @typedef {import('playwright-core').Page} Page
 * @typedef {{
 *   testid: string,
 *   tag: string,
 *   role: string | null,
 *   text: string,
 *   visible: boolean,
 * }} TestIdRegion
 */

/**
 * @param {Page} page
 * @param {string | null | undefined} rootSelector
 * @returns {Promise<TestIdRegion[]>}
 */
export async function collectTestIdRegions(page, rootSelector) {
  return page.evaluate((selector) => {
    const root = selector ? document.querySelector(selector) : document;
    if (!root) return [];

    const elements =
      root === document
        ? [...document.querySelectorAll('[data-testid]')]
        : [
            ...(root.matches('[data-testid]') ? [root] : []),
            ...root.querySelectorAll('[data-testid]'),
          ];

    return elements.map((el) => ({
      testid: el.getAttribute('data-testid') ?? '',
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 200),
      visible: !!(
        el.offsetWidth ||
        el.offsetHeight ||
        el.getClientRects().length
      ),
    }));
  }, rootSelector ?? null);
}

/**
 * @param {Page} page
 * @param {{ selector?: string }} [options]
 * @returns {Promise<string>}
 */
export async function captureAriaSnapshot(page, options = {}) {
  const locator = options.selector
    ? page.locator(options.selector).first()
    : page.locator('body');

  return locator.ariaSnapshot({ mode: 'ai' });
}

/**
 * @param {Page} page
 * @param {{ selector?: string }} [options]
 * @returns {Promise<{ title: string, url: string, testIds: TestIdRegion[], ariaYaml: string }>}
 */
export async function buildPageSnapshot(page, options = {}) {
  const [title, url, testIds, ariaYaml] = await Promise.all([
    page.title(),
    page.url(),
    collectTestIdRegions(page, options.selector),
    captureAriaSnapshot(page, options),
  ]);

  return {
    title,
    url,
    testIds: testIds.filter((region) => region.testid.length > 0),
    ariaYaml,
  };
}
