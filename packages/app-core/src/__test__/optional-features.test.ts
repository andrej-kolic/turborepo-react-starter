import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

const reportError = vi.fn<(error: unknown, errorInfo: ErrorInfo) => void>();

// The SDK sends events over the network; replace it at that boundary.
vi.mock('@sentry/react', () => ({
  init: vi.fn<typeof Sentry.init>(),
  browserTracingIntegration: vi.fn<() => { name: string }>(() => ({
    name: 'BrowserTracing',
  })),
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
    window.history.pushState({}, '', '/');
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

  it('startsSentryWithTracingAtTheSampleRate_whenProdAndDsnSet', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);
    vi.stubEnv('BUILD_ENVIRONMENT', 'staging');
    vi.stubEnv('APP_REACT_VERSION', '1.2.3');
    vi.stubEnv('GIT_COMMIT', 'abc1234def5678abc1234def5678abc1234def56');
    // Vitest keeps stubbed values as strings; the bundlers insert the number.
    vi.stubEnv('APP_REACT_SENTRY_TRACES_SAMPLE_RATE', '0.25');

    await loadRootOptions();

    await vi.waitFor(() =>
      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: DSN,
        environment: 'staging',
        release: 'turborepo-react-starter@1.2.3+abc1234',
        integrations: [{ name: 'BrowserTracing' }],
        tracesSampleRate: '0.25',
      }),
    );
  });

  it('namesEachPageViewAfterItsPath_whenProdAndDsnSet', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);
    window.history.pushState({}, '', '/checkout');

    await loadRootOptions();
    await vi.waitFor(() =>
      expect(Sentry.browserTracingIntegration).toHaveBeenCalled(),
    );
    const options = vi.mocked(Sentry.browserTracingIntegration).mock
      .lastCall?.[0];

    expect(
      options?.beforeStartSpan?.({ name: 'Pageload', op: 'pageload' }),
    ).toEqual({ name: '/checkout', op: 'pageload' });
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
