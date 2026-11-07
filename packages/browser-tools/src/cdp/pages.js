/**
 * @typedef {import('playwright-core').Browser} Browser
 * @typedef {import('playwright-core').BrowserContext} BrowserContext
 * @typedef {import('playwright-core').Page} Page
 */

/**
 * Find an open page whose origin matches the given URL.
 * When multiple tabs share the origin, returns the most recently used one
 * (last in CDP tab order).
 *
 * @param {Browser} browser
 * @param {string} url
 * @returns {Promise<Page | null>}
 */
export async function findPageAtOrigin(browser, url) {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return null;
  }

  for (const context of [...browser.contexts()].reverse()) {
    for (const page of [...context.pages()].reverse()) {
      try {
        if (new URL(page.url()).origin === origin) {
          return page;
        }
      } catch {
        // skip chrome://, about:blank, etc.
      }
    }
  }

  return null;
}

/**
 * Return the most recently used non-blank page in an existing Chrome session.
 *
 * @param {Browser} browser
 * @returns {{ context: BrowserContext, page: Page }}
 */
export function findRecentPage(browser) {
  for (const context of browser.contexts()) {
    const pages = [...context.pages()].reverse();
    if (pages.length === 0) {
      continue;
    }

    const page =
      pages.find((p) => {
        const url = p.url();
        return url !== 'about:blank' && !url.startsWith('devtools://');
      }) ?? pages[0];

    return { context, page };
  }

  throw new Error('No existing Chrome page target found.');
}
