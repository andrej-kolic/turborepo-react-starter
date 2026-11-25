import * as Sentry from '@sentry/react';
import { router } from '../router';
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
    // Names each page view after its route (`/`, `/about`), so Sentry's Web Vitals table has one
    // row per page. Why: decision 0012.
    Sentry.tanstackRouterBrowserTracingIntegration(router),
  ],
  tracesSampleRate: import.meta.env.APP_REACT_SENTRY_TRACES_SAMPLE_RATE,
  // Errors and Web Vitals don't need the visitor's IP, which is personal data; SDK 11 sends it by default.
  dataCollection: { userInfo: false },
});

export const reportError = Sentry.reactErrorHandler();
