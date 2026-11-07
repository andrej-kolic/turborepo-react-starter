/**
 * @typedef {import('playwright-core').Page} Page
 * @typedef {'errors' | 'full'} ConsoleListenerMode
 */

/**
 * Attach page console listeners. Full mode records all messages; errors mode collects errors only.
 *
 * @param {Page} page
 * @param {{ mode?: ConsoleListenerMode }} [options]
 * @returns {{ pageErrors: string[], detach(): void } | { getEntries(): object[], detach(): void }}
 */
export function attachConsoleListeners(page, { mode = 'errors' } = {}) {
  if (mode === 'full') {
    const entries = [];

    const onConsole = (msg) => {
      entries.push({
        channel: 'runtime',
        type: msg.type(),
        timestamp: Date.now(),
        text: msg.text(),
        location: msg.location(),
      });
    };

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

  const pageErrors = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`[console.error] ${msg.text()}`);
    }
  };

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
