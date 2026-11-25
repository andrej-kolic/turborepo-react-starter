/**
 * Which todo API the app under test calls. Used by `playwright.config.ts`, which builds the app with it,
 * and by `fixtures/app-target.ts`, which answers requests to it.
 */

/**
 * The `APP_REACT_API_URL` of the build under test: the shell's value, else a placeholder. A URL is never reached:
 * the test fixture answers for it. With `TARGET_URL` the build already exists, so set the value it was built with.
 */
export const API_URL = (
  process.env.APP_REACT_API_URL || 'https://api.example.test'
).replace(/\/+$/, '');

/** Whether the build answers its own API requests, with the mock inside the app, so the tests must not. */
export const IN_APP_MOCK = API_URL === 'mock';
