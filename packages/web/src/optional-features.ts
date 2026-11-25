import type { RootOptions } from 'react-dom/client';
import { apiBaseUrl } from './api';
import { errorReportingHandlers } from './error-reporting';

/**
 * `createRoot` options that report React's caught, uncaught and recoverable errors to Sentry.
 * Empty in the dev server and in builds without `APP_REACT_SENTRY_DSN`, which then ship no Sentry code.
 */
export const rootOptions: RootOptions = {};

if (import.meta.env.PROD && import.meta.env.APP_REACT_SENTRY_DSN) {
  Object.assign(
    rootOptions,
    errorReportingHandlers(import('./error-reporting/sentry')),
  );
}

// Before the first render, as MSW's docs show (https://mswjs.io/docs/integrations/browser): the apps import this
// file, so they render only once the mocked API answers requests. Builds with an API URL ship no MSW code.
if (import.meta.env.APP_REACT_API_URL === 'mock') {
  try {
    const { createWorker } = await import('@repo/core/mocks/browser');
    // The worker sees every request the page makes (scripts, images, Sentry reports);
    // 'bypass' sends those with no handler to the network without MSW's default console warning.
    await createWorker(apiBaseUrl).start({ onUnhandledFrame: 'bypass' });
  } catch (error) {
    // An error here would stop the apps from rendering; caught, only the todo page fails.
    console.error('The mocked API did not start:', error);
  }
}
