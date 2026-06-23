import { afterEach, describe, expect, it } from 'vitest';
import { recordConsole } from '../src/capture/console.js';

describe('recordConsole', () => {
  const prevAppUrl = process.env.APP_URL;
  const prevCaptureUrl = process.env.CAPTURE_URL;

  afterEach(() => {
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
    if (prevCaptureUrl === undefined) delete process.env.CAPTURE_URL;
    else process.env.CAPTURE_URL = prevCaptureUrl;
  });

  it('requires a URL when attach is set', async () => {
    delete process.env.APP_URL;
    delete process.env.CAPTURE_URL;

    await expect(recordConsole({ attach: true }, undefined)).rejects.toThrow(
      'record-console requires a URL: pass as positional, or set APP_URL or CAPTURE_URL.',
    );
  });
});
