/**
 * @typedef {import('playwright-core').Page} Page
 * @typedef {import('playwright-core').ConsoleMessage} ConsoleMessage
 * @typedef {'errors' | 'full'} ConsoleListenerMode
 * @typedef {{ pageErrors: string[], detach(): void }} ErrorsListener
 * @typedef {{ getEntries(): object[], detach(): void }} FullListener
 */

/**
 * Attach page console listeners. Full mode records all messages; errors mode collects errors only.
 *
 * @overload
 * @param {Page} page
 * @param {{ mode: 'full' }} options
 * @returns {FullListener}
 */
/**
 * @overload
 * @param {Page} page
 * @param {{ mode?: 'errors' }} [options]
 * @returns {ErrorsListener}
 */
/**
 * @param {Page} page
 * @param {{ mode?: ConsoleListenerMode }} [options]
 * @returns {ErrorsListener | FullListener}
 */
export function attachConsoleListeners(page, { mode = 'errors' } = {}) {
  if (mode === 'full') {
    /** @type {object[]} */
    const entries = [];

    /** @param {ConsoleMessage} msg */
    const onConsole = (msg) => {
      entries.push({
        channel: 'runtime',
        type: msg.type(),
        timestamp: Date.now(),
        text: msg.text(),
        location: msg.location(),
      });
    };

    /** @param {Error} error */
    const onPageError = (error) => {
      entries.push({
        channel: 'exception',
        timestamp: Date.now(),
        text: error.message,
        stack: error.stack ?? null,
      });
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    return {
      getEntries: () => entries,
      detach() {
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
      },
    };
  }

  /** @type {string[]} */
  const pageErrors = [];

  /** @param {ConsoleMessage} msg */
  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`[console.error] ${msg.text()}`);
    }
  };

  /** @param {Error} error */
  const onPageError = (error) => {
    pageErrors.push(`[pageerror] ${error.message}`);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    pageErrors,
    detach() {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
    },
  };
}
