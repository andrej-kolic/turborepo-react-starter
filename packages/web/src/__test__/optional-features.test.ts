import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';

const reportError = vi.fn<(error: unknown, errorInfo: ErrorInfo) => void>();

// The SDK sends events over the network; replace it at that boundary.
vi.mock('@sentry/react', () => ({
  init: vi.fn<typeof Sentry.init>(),
  tanstackRouterBrowserTracingIntegration: vi.fn<() => { name: string }>(
    () => ({ name: 'BrowserTracing' }),
  ),
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
        dataCollection: { userInfo: false },
      }),
    );
  });

  it('sendsNoUserInfo_whenProdAndDsnSet', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);

    await loadRootOptions();

    await vi.waitFor(() =>
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ dataCollection: { userInfo: false } }),
      ),
    );
  });

  it('tracesPageViewsThroughTheAppRouter_whenProdAndDsnSet', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('APP_REACT_SENTRY_DSN', DSN);

    await loadRootOptions();
    // the router that loadRootOptions just loaded, after resetModules
    const { router } = await import('../router');

    await vi.waitFor(() =>
      expect(
        Sentry.tanstackRouterBrowserTracingIntegration,
      ).toHaveBeenCalledWith(router),
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

describe('mocked API', () => {
  const start = vi.fn<() => Promise<undefined>>(() =>
    Promise.resolve(undefined),
  );
  const createWorker = vi.fn<(baseUrl: string) => { start: typeof start }>(
    () => ({ start }),
  );

  function loadOptionalFeatures() {
    vi.resetModules();
    // The service worker needs a real browser; replace MSW's browser setup at that boundary.
    vi.doMock('@repo/core/mocks/browser', () => ({ createWorker }));
    return import('../optional-features');
  }

  beforeEach(() => vi.clearAllMocks());

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('@repo/core/mocks/browser');
  });

  it('startsTheWorkerAtTheApiPath_whenApiUrlIsMock', async () => {
    vi.stubEnv('APP_REACT_API_URL', 'mock');

    await loadOptionalFeatures();

    expect(createWorker).toHaveBeenCalledExactlyOnceWith('/api');
    expect(start).toHaveBeenCalledExactlyOnceWith({
      onUnhandledFrame: 'bypass',
    });
  });

  it('finishesLoadingAndLogsTheError_whenTheWorkerFailsToStart', async () => {
    vi.stubEnv('APP_REACT_API_URL', 'mock');
    const error = new Error('no service worker');
    start.mockRejectedValueOnce(error);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { rootOptions } = await loadOptionalFeatures();

    expect(rootOptions).toBeDefined();
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), error);
    consoleError.mockRestore();
  });

  it('finishesLoadingOnlyOnceTheWorkerAnswers_whenApiUrlIsMock', async () => {
    vi.stubEnv('APP_REACT_API_URL', 'mock');
    let workerStarted: () => void = () => {};
    start.mockReturnValueOnce(
      new Promise((resolve) => {
        workerStarted = () => resolve(undefined);
      }),
    );
    let loaded = false;

    const loading = loadOptionalFeatures().then(() => {
      loaded = true;
    });
    await vi.waitFor(() => expect(start).toHaveBeenCalled());
    expect(loaded).toBe(false);

    workerStarted();
    await loading;
    expect(loaded).toBe(true);
  });

  it('startsNoWorker_whenApiUrlIsAUrl', async () => {
    vi.stubEnv('APP_REACT_API_URL', 'https://api.example.com');

    await loadOptionalFeatures();

    expect(createWorker).not.toHaveBeenCalled();
  });
});
