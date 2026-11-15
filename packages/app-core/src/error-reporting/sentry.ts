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
});

export const reportError = Sentry.reactErrorHandler();
