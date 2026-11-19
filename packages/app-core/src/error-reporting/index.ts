import type { ErrorInfo } from 'react';
import type { RootOptions } from 'react-dom/client';

type SentryModule = typeof import('./sentry');

/**
 * `createRoot` error handlers that log each error and report it once `sentry` loads.
 * Call it only behind the gate in `optional-features.ts`, which passes `import('./error-reporting/sentry')`.
 */
export function errorReportingHandlers(
  sentryModule: Promise<SentryModule>,
): Pick<
  RootOptions,
  'onCaughtError' | 'onUncaughtError' | 'onRecoverableError'
> {
  // The file can fail to load, for example in a tab opened before its files were replaced; the app then runs without Sentry.
  const loaded = sentryModule.catch(() => undefined);

  // Replacing React's handlers also replaces its console log, so log here as React does.
  const report = (error: unknown, errorInfo: ErrorInfo) => {
    // oxlint-disable-next-line no-console -- stands in for React's own log
    console.error(error);
    void loaded.then((module) => module?.reportError(error, errorInfo));
  };

  return {
    onCaughtError: report,
    onUncaughtError: report,
    onRecoverableError: report,
  };
}
