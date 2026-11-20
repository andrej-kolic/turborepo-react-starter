import type { RootOptions } from 'react-dom/client';
import { errorReportingHandlers } from './error-reporting';

/**
 * `createRoot` options that report React's caught, uncaught and recoverable errors to Sentry.
 * Empty in the dev server and in builds without `APP_REACT_SENTRY_DSN`, which then ship no Sentry code.
 */
export const rootOptions: RootOptions = {};

// Each feature reads its values straight from import.meta.env and writes import() inside the if,
// so the bundler can drop the import(): see docs/template/env.md.
if (import.meta.env.PROD && import.meta.env.APP_REACT_SENTRY_DSN) {
  Object.assign(
    rootOptions,
    errorReportingHandlers(import('./error-reporting/sentry')),
  );
}
