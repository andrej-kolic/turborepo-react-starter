/**
 * The API setting of the app that the E2E tests run on: a URL, or `mock` for the mock inside the app.
 * `playwright.config.ts` builds the app with it. `fixtures/app-target.ts` answers the app's requests to that URL,
 * so they never reach a real API.
 */

/**
 * `APP_REACT_API_URL` from the shell, or a placeholder URL when it is not set.
 * If you test an app that is already running (`TARGET_URL`), set `APP_REACT_API_URL` to the value that app was built with.
 */
export const API_URL = (
  process.env.APP_REACT_API_URL || 'https://api.example.test'
).replace(/\/+$/, '');

/** True when the app was built with its mock inside (`APP_REACT_API_URL=mock`). The tests then don't mock the API themselves. */
export const IN_APP_MOCK = API_URL === 'mock';
