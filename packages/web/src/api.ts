/**
 * The todo API's base URL, passed to every `@repo/core` API function. Without `APP_REACT_API_URL`,
 * `/api` on the app's own address, which the mocked API answers (`startMockApi` in `optional-features.ts`).
 */
export const apiBaseUrl = import.meta.env.APP_REACT_API_URL ?? '/api';
