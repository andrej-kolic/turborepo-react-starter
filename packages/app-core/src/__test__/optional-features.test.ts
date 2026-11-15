import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

const reportError = vi.fn<(error: unknown, errorInfo: ErrorInfo) => void>();

// The SDK sends events over the network; replace it at that boundary.
vi.mock('@sentry/react', () => ({
  init: vi.fn<typeof Sentry.init>(),
  reactErrorHandler: vi.fn<() => typeof reportError>(() => reportError),
}));

const DSN = 'https://public@example.ingest.sentry.io/1';

async function loadRootOptions() {
  vi.resetModules();
  const { rootOptions } = await import('../optional-features');
  return rootOptions;
}

describe('rootOptions', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // The handlers log every error, as React does; keep the test output clean.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.doUnmock('../error-reporting/sentry');
  });

  it('hasNoHandlers_whenDsnIsUnset', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('APP_REACT_SENTRY_DSN', undefined);

    expect(await loadRootOptions()).toEqual({});
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('hasNoHandlers_inDevServer', async () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);

    expect(await loadRootOptions()).toEqual({});
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('startsSentryTaggedWithBuildEnvironment_whenProdAndDsnSet', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);
    vi.stubEnv('BUILD_ENVIRONMENT', 'staging');

    await loadRootOptions();

    await vi.waitFor(() =>
      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: DSN,
        environment: 'staging',
      }),
    );
  });

  it.each(['onCaughtError', 'onUncaughtError', 'onRecoverableError'] as const)(
    'reportsAndLogsError_from%s_whenProdAndDsnSet',
    async (handler) => {
      vi.stubEnv('PROD', true);
      vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);
      const error = new Error('render failed');
      const errorInfo = { componentStack: '\n    at Broken' };

      const rootOptions = await loadRootOptions();
      rootOptions[handler]?.(error, errorInfo);

      expect(consoleError).toHaveBeenCalledWith(error);
      await vi.waitFor(() =>
        expect(reportError).toHaveBeenCalledWith(error, errorInfo),
      );
    },
  );

  // Vitest fails the run on an unhandled rejection, so passing means the failure was absorbed.
  it('logsErrorWithoutReporting_whenSentryFileFailsToLoad', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);
    vi.doMock('../error-reporting/sentry', () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    const error = new Error('render failed');

    const rootOptions = await loadRootOptions();
    rootOptions.onUncaughtError?.(error, { componentStack: '' });
    await vi.dynamicImportSettled();

    expect(consoleError).toHaveBeenCalledWith(error);
    expect(reportError).not.toHaveBeenCalled();
  });
});
