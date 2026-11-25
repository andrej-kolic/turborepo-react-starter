/**
 * The todo API's base URL, passed to every `@repo/core` API function: `APP_REACT_API_URL`, or `/api`
 * on the app's own address when that is "mock", which the mocked API answers (`optional-features.ts`).
 */
export const apiBaseUrl =
  import.meta.env.APP_REACT_API_URL === 'mock'
    ? '/api'
    : import.meta.env.APP_REACT_API_URL;
