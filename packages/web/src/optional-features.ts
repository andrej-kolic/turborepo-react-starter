import type { RootOptions } from 'react-dom/client';
import { apiBaseUrl } from './api';
import { errorReportingHandlers } from './error-reporting';

/**
 * `createRoot` options that report React's caught, uncaught and recoverable errors to Sentry.
 * Empty in the dev server and in builds without `APP_REACT_SENTRY_DSN`, which then ship no Sentry code.
 */
export const rootOptions: RootOptions = {};

let mockApi: Promise<void> | undefined;

/**
 * Starts the mocked todo API the first time it is called, and resolves once it answers requests.
 * The todo route's loader awaits it before its first request. Resolves at once in builds with
 * `APP_REACT_API_URL`, which ship no mock.
 */
export function startMockApi(): Promise<void> {
  // Each feature reads its values straight from import.meta.env and writes import() inside the if,
  // so the bundler can drop the import(): see docs/template/env.md.
  if (!import.meta.env.APP_REACT_API_URL) {
    mockApi ??= import('@repo/core/mocks/browser')
      .then(({ createWorker }) =>
        // The worker sees every request the page makes (scripts, images, Sentry reports);
        // 'bypass' sends those with no handler to the network without MSW's default console warning.
        createWorker(apiBaseUrl).start({ onUnhandledFrame: 'bypass' }),
      )
      .then(
        () => undefined,
        (error: unknown) => {
          // Lets the next visit to the todo page try again.
          mockApi = undefined;
          throw error;
        },
      );
  }
  return mockApi ?? Promise.resolve();
}

if (import.meta.env.PROD && import.meta.env.APP_REACT_SENTRY_DSN) {
  Object.assign(
    rootOptions,
    errorReportingHandlers(import('./error-reporting/sentry')),
  );
}
