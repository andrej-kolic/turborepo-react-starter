import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.APP_REACT_SENTRY_DSN,
  environment: import.meta.env.BUILD_ENVIRONMENT,
});

export const reportError = Sentry.reactErrorHandler();
