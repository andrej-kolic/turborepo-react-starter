/**
 * Public CDP API — import surface for bin/browser.js and @repo/browser-tools/cdp.
 */

export {
  assertNoConsoleErrors,
  assertSelectorExists,
  assertTextVisible,
} from './assert.js';

export { attachConsoleListeners } from './console.js';

export { DEFAULT_HOST, DEFAULT_PORT } from './constants.js';

export { connectOverCDP } from './connect.js';

export { evaluateScript, readSelector, takeScreenshot } from './read.js';

export { fetchCdpJson, resolveCdpEndpoint } from './http.js';

export { findPageAtOrigin, findRecentPage } from './pages.js';

export {
  consoleDiagnostics,
  selectorTimeout,
  sessionDiagnostics,
  settlePage,
  waitForSelectorOrDiagnostics,
  withAttachedSession,
  withPageSession,
} from './session.js';

export { formatPageSnapshot, takePageSnapshot } from './snapshot/index.js';

export { openUrl } from './tabs.js';
