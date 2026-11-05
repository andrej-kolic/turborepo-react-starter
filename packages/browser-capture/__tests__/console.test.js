import { afterEach, describe, expect, it } from 'vitest';
import { recordConsole } from '../src/capture/console.js';

describe('recordConsole', () => {
  const prevTargetUrl = process.env.TARGET_URL;
  const prevCaptureUrl = process.env.CAPTURE_URL;

  afterEach(() => {
    if (prevTargetUrl === undefined) delete process.env.TARGET_URL;
    else process.env.TARGET_URL = prevTargetUrl;
    if (prevCaptureUrl === undefined) delete process.env.CAPTURE_URL;
    else process.env.CAPTURE_URL = prevCaptureUrl;
  });

  it('requires a URL when attach is set', async () => {
    delete process.env.TARGET_URL;
    delete process.env.CAPTURE_URL;

    await expect(recordConsole({ attach: true }, undefined)).rejects.toThrow(
      'record-console requires a URL: pass as positional, or set TARGET_URL or CAPTURE_URL.',
    );
  });
});
