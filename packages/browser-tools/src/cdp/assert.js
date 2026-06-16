import {
  consoleDiagnostics,
  selectorTimeout,
  settlePage,
  waitForSelectorOrDiagnostics,
  withPageSession,
} from './session.js';

/**
 * @typedef {import('./session.js').SessionOptions} SessionOptions
 */

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
