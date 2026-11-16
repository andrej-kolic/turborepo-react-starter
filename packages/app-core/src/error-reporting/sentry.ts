import * as Sentry from '@sentry/react';
import { sentryRelease } from './release';

Sentry.init({
  dsn: import.meta.env.APP_REACT_SENTRY_DSN,
  environment: import.meta.env.BUILD_ENVIRONMENT,
  release: sentryRelease(
    import.meta.env.APP_REACT_VERSION,
    // oxlint-disable-next-line turbo/no-undeclared-env-vars -- read from git by the bundler config, not an env var; Turbo must not hash it
    import.meta.env.GIT_COMMIT,
  ),
  integrations: [
    Sentry.browserTracingIntegration({
      // Name each page view after its path, so Sentry's Web Vitals table has one row per page
      // instead of one "Pageload" row for all. Why: decision 0012.
      beforeStartSpan: (options) => ({
        ...options,
        name: window.location.pathname,
      }),
    }),
  ],
  tracesSampleRate: import.meta.env.APP_REACT_SENTRY_TRACES_SAMPLE_RATE,
});

export const reportError = Sentry.reactErrorHandler();
