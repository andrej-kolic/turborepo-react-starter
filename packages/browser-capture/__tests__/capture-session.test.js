import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@repo/browser-tools/cdp', () => ({
  connectOverCDP: vi.fn(),
}));

vi.mock('../src/performance/metrics.js', () => ({
  getPerformanceMetrics: vi.fn(),
}));

import { connectOverCDP } from '@repo/browser-tools/cdp';
import { getPerformanceMetrics } from '../src/performance/metrics.js';
import {
  collectPerformancePayload,
  getPageDetails,
  gotoTarget,
  runCaptureSession,
  withCdpBrowser,
  withIsolatedCapture,
} from '../src/capture/capture-session.js';

function mockBrowserSession() {
  const context = { close: vi.fn().mockResolvedValue(undefined) };
  const browser = {
    newContext: vi.fn().mockResolvedValue(context),
    close: vi.fn().mockResolvedValue(undefined),
  };
  connectOverCDP.mockResolvedValue(browser);
  return { browser, context };
}

describe('runCaptureSession', () => {
  it('routes to attachedFn when attach is set', async () => {
    const attachedFn = vi.fn().mockResolvedValue('attached');
    const isolatedFn = vi.fn();

    const result = await runCaptureSession({
      command: 'record-trace',
      url: 'http://localhost:5173',
      options: { attach: true, duration: '1' },
      attachedFn,
      isolatedFn,
    });

    expect(result).toBe('attached');
    expect(attachedFn).toHaveBeenCalledWith('http://localhost:5173', 1000);
    expect(isolatedFn).not.toHaveBeenCalled();
  });

  it('routes to isolatedFn when attach is not set', async () => {
    const attachedFn = vi.fn();
    const isolatedFn = vi.fn().mockResolvedValue('isolated');

    const result = await runCaptureSession({
      command: 'record-performance',
      url: 'http://localhost:5173',
      options: { duration: '2' },
      attachedFn,
      isolatedFn,
    });

    expect(result).toBe('isolated');
    expect(isolatedFn).toHaveBeenCalledWith('http://localhost:5173', 2000);
    expect(attachedFn).not.toHaveBeenCalled();
  });
});

describe('withCdpBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes the browser after fn completes', async () => {
    const browser = { close: vi.fn().mockResolvedValue(undefined) };
    connectOverCDP.mockResolvedValue(browser);

    const result = await withCdpBrowser(async (connectedBrowser) => {
      expect(connectedBrowser).toBe(browser);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(browser.close).toHaveBeenCalled();
  });
});

describe('withIsolatedCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a default context when only fn is passed', async () => {
    const { browser, context } = mockBrowserSession();

    const result = await withIsolatedCapture(async ({ context: ctx }) => {
      expect(ctx).toBe(context);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(browser.newContext).toHaveBeenCalledWith({});
    expect(context.close).toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalled();
  });

  it('passes context options when provided', async () => {
    const { browser } = mockBrowserSession();
    const contextOptions = {
      recordHar: { path: '/tmp/har.json', content: 'omit' },
    };

    await withIsolatedCapture(contextOptions, async () => 'ok');

    expect(browser.newContext).toHaveBeenCalledWith(contextOptions);
  });

  it('cleans up when fn throws', async () => {
    const { browser, context } = mockBrowserSession();

    await expect(
      withIsolatedCapture(async () => {
        throw new Error('capture failed');
      }),
    ).rejects.toThrow('capture failed');

    expect(context.close).toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalled();
  });

  it('closes the browser when newContext throws', async () => {
    const browser = {
      newContext: vi.fn().mockRejectedValue(new Error('context failed')),
      close: vi.fn().mockResolvedValue(undefined),
    };
    connectOverCDP.mockResolvedValue(browser);

    await expect(withIsolatedCapture(async () => 'ok')).rejects.toThrow(
      'context failed',
    );

    expect(browser.close).toHaveBeenCalled();
  });
});

describe('getPageDetails', () => {
  it('returns url and title from the page', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue({
        url: 'http://localhost:5173',
        title: 'App',
      }),
    };

    await expect(getPageDetails(page)).resolves.toEqual({
      url: 'http://localhost:5173',
      title: 'App',
    });
  });

  it('returns null url and title when evaluate fails', async () => {
    const page = { evaluate: vi.fn().mockRejectedValue(new Error('gone')) };

    await expect(getPageDetails(page)).resolves.toEqual({
      url: null,
      title: null,
    });
  });
});

describe('collectPerformancePayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collects page details and metrics, then detaches the cdp session', async () => {
    const cdpSession = { detach: vi.fn().mockResolvedValue(undefined) };
    const page = {
      context: () => ({
        newCDPSession: vi.fn().mockResolvedValue(cdpSession),
      }),
      evaluate: vi.fn().mockResolvedValue({
        url: 'http://localhost:5173',
        title: 'App',
      }),
    };
    const performancePayload = {
      webVitals: { lcp: 100, cls: 0, inp: null },
      browserMetrics: [],
    };
    getPerformanceMetrics.mockResolvedValue(performancePayload);

    const result = await collectPerformancePayload(page);

    expect(result).toEqual({
      pageDetails: { url: 'http://localhost:5173', title: 'App' },
      performancePayload,
    });
    expect(getPerformanceMetrics).toHaveBeenCalledWith(page, cdpSession);
    expect(cdpSession.detach).toHaveBeenCalled();
  });

  it('detaches the cdp session when metrics collection fails', async () => {
    const cdpSession = { detach: vi.fn().mockResolvedValue(undefined) };
    const page = {
      context: () => ({
        newCDPSession: vi.fn().mockResolvedValue(cdpSession),
      }),
      evaluate: vi.fn().mockRejectedValue(new Error('gone')),
    };
    getPerformanceMetrics.mockRejectedValue(new Error('metrics failed'));

    await expect(collectPerformancePayload(page)).rejects.toThrow(
      'metrics failed',
    );
    expect(cdpSession.detach).toHaveBeenCalled();
  });
});

describe('gotoTarget', () => {
  it('navigates with load wait and a 30s timeout', async () => {
    const page = { goto: vi.fn().mockResolvedValue(undefined) };

    await gotoTarget(page, 'http://localhost:5173');

    expect(page.goto).toHaveBeenCalledWith('http://localhost:5173', {
      waitUntil: 'load',
      timeout: 30_000,
    });
  });
});
