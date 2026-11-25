/** This file says which API the tested app uses: a URL, or `mock` for the fake API built into the app. */

/**
 * The API the tested app was built with. Set `APP_REACT_API_URL` in the shell to change it.
 * If you test an app that is already running (`TARGET_URL`), set it to the value that app was built with.
 */
export const API_URL = (
  process.env.APP_REACT_API_URL || 'https://api.example.test'
).replace(/\/+$/, '');

/** True when the app uses the fake API built into it. The tests then don't add their own. */
export const IN_APP_MOCK = API_URL === 'mock';
