/**
 * Public CDP API — single import surface for bin/browser.js.
 */

export {
  assertNoConsoleErrors,
  assertSelectorExists,
  assertTextVisible,
} from './assert.js';

export { evaluateScript, readSelector, takeScreenshot } from './read.js';

export { formatPageSnapshot, takePageSnapshot } from './snapshot/index.js';
