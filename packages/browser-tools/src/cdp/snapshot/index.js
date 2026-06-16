import {
  selectorTimeout,
  settlePage,
  waitForSelectorOrDiagnostics,
  withPageSession,
} from '../session.js';
import { buildPageSnapshot } from './capture.js';

export { formatPageSnapshot } from './format.js';

/**
 * @param {string} url
 * @param {import('../session.js').SessionOptions} [options]
 * @returns {Promise<{ found: boolean, snapshot?: Awaited<ReturnType<typeof buildPageSnapshot>>, diagnostics?: object }>}
 */
export async function takePageSnapshot(url, options = {}) {
  const timeout = selectorTimeout(options);

  return withPageSession(
    url,
    async (session) => {
      if (options.selector) {
        const wait = await waitForSelectorOrDiagnostics(
          session,
          options.selector,
          timeout,
        );
        if (!wait.ok) {
          return { found: false, diagnostics: wait.diagnostics };
        }
      } else {
        const settled = await settlePage(session, undefined, timeout);
        if (!settled.ok) {
          return { found: false, diagnostics: settled.diagnostics };
        }
      }

      const snapshot = await buildPageSnapshot(session.page, {
        selector: options.selector,
      });

      return { found: true, snapshot };
    },
    options,
  );
}
