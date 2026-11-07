import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCdpJson, resolveCdpEndpoint } from '../http.js';

describe('resolveCdpEndpoint', () => {
  const prevPort = process.env.CHROME_DEBUG_PORT;
  const prevHost = process.env.CHROME_DEBUG_HOST;

  afterEach(() => {
    process.env.CHROME_DEBUG_PORT = prevPort;
    process.env.CHROME_DEBUG_HOST = prevHost;
  });

  it('uses defaults when env and args are omitted', () => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;

    expect(resolveCdpEndpoint()).toEqual({
      port: 9222,
      host: 'localhost',
      baseUrl: 'http://localhost:9222',
    });
  });

  it('prefers explicit port and host over env', () => {
    process.env.CHROME_DEBUG_PORT = '9333';
    process.env.CHROME_DEBUG_HOST = '127.0.0.1';

    expect(resolveCdpEndpoint(9222, 'localhost')).toEqual({
      port: 9222,
      host: 'localhost',
      baseUrl: 'http://localhost:9222',
    });
  });
});

describe('fetchCdpJson', () => {
  beforeEach(() => {
    delete process.env.CHROME_DEBUG_PORT;
    delete process.env.CHROME_DEBUG_HOST;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and parses JSON from the CDP HTTP API', async () => {
    const payload = { Browser: 'Chrome/120', webSocketDebuggerUrl: 'ws://x' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        expect(url).toBe('http://localhost:9222/json/version');
        return {
          ok: true,
          json: async () => payload,
        };
      }),
    );

    await expect(fetchCdpJson('/json/version')).resolves.toEqual(payload);
  });

  it('throws when the CDP endpoint returns a non-2xx status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
      })),
    );

    await expect(fetchCdpJson('/json/list')).rejects.toThrow(
      'GET /json/list failed with status 503',
    );
  });
});
