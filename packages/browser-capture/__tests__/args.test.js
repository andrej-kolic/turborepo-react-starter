import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureOptions,
  parseArgs,
  requireUrl,
  resolveCaptureUrl,
  resolveDurationMs,
} from '../src/cli/args.js';
import {
  getDefaultDurationMs,
  validateCaptureDuration,
} from '../src/config/env.js';

describe('parseArgs', () => {
  it('parses positionals and options', () => {
    const { positionals, options } = parseArgs([
      'http://localhost:5173',
      '--duration',
      '5',
      '--no-sanitize',
    ]);

    expect(positionals).toEqual(['http://localhost:5173']);
    expect(options.duration).toBe('5');
    expect(options['no-sanitize']).toBe(true);
  });

  it('parses inline --key=value', () => {
    const { options } = parseArgs(['--duration-ms=3000']);
    expect(options['duration-ms']).toBe('3000');
  });

  it('parses --attach flag', () => {
    const { options } = parseArgs(['http://localhost:5173', '--attach']);
    expect(options.attach).toBe(true);
  });
});

describe('captureOptions', () => {
  beforeEach(() => {
    validateCaptureDuration(true);
  });

  it('maps attach flag', () => {
    expect(captureOptions({ attach: true, duration: '3' })).toEqual({
      durationMs: 3000,
      attach: true,
    });
  });

  it('defaults attach to false', () => {
    expect(captureOptions({})).toMatchObject({
      attach: false,
    });
  });
});

describe('resolveCaptureUrl', () => {
  const prevAppUrl = process.env.APP_URL;
  const prevCaptureUrl = process.env.CAPTURE_URL;

  afterEach(() => {
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
    if (prevCaptureUrl === undefined) delete process.env.CAPTURE_URL;
    else process.env.CAPTURE_URL = prevCaptureUrl;
  });

  it('prefers positional URL', () => {
    delete process.env.APP_URL;
    delete process.env.CAPTURE_URL;
    expect(resolveCaptureUrl('http://localhost:5173')).toBe(
      'http://localhost:5173',
    );
  });

  it('falls back to APP_URL', () => {
    process.env.APP_URL = 'http://localhost:5173';
    delete process.env.CAPTURE_URL;
    expect(resolveCaptureUrl(undefined)).toBe('http://localhost:5173');
  });

  it('falls back to CAPTURE_URL when APP_URL is unset', () => {
    delete process.env.APP_URL;
    process.env.CAPTURE_URL = 'http://localhost:3000';
    expect(resolveCaptureUrl(undefined)).toBe('http://localhost:3000');
  });

  it('prefers APP_URL over CAPTURE_URL', () => {
    process.env.APP_URL = 'http://localhost:5173';
    process.env.CAPTURE_URL = 'http://localhost:3000';
    expect(resolveCaptureUrl(undefined)).toBe('http://localhost:5173');
  });
});

describe('requireUrl', () => {
  it('returns the url when provided', () => {
    expect(requireUrl('record-trace', 'http://localhost:5173')).toBe(
      'http://localhost:5173',
    );
  });

  it('throws when url is missing', () => {
    const prevAppUrl = process.env.APP_URL;
    const prevCaptureUrl = process.env.CAPTURE_URL;
    delete process.env.APP_URL;
    delete process.env.CAPTURE_URL;

    expect(() => requireUrl('record-trace', undefined)).toThrow(
      'record-trace requires a URL: pass as positional, or set APP_URL or CAPTURE_URL.',
    );

    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
    if (prevCaptureUrl === undefined) delete process.env.CAPTURE_URL;
    else process.env.CAPTURE_URL = prevCaptureUrl;
  });
});

describe('resolveDurationMs', () => {
  beforeEach(() => {
    validateCaptureDuration(true);
  });

  it('converts duration seconds to milliseconds', () => {
    expect(resolveDurationMs({ duration: '3' })).toBe(3000);
  });

  it('accepts duration-ms directly', () => {
    expect(resolveDurationMs({ 'duration-ms': '2500' })).toBe(2500);
  });

  it('falls back to default duration', () => {
    expect(resolveDurationMs({})).toBe(getDefaultDurationMs());
  });

  it('rejects non-positive duration', () => {
    expect(() => resolveDurationMs({ duration: '0' })).toThrow(
      'duration must be a positive number of seconds.',
    );
    expect(() => resolveDurationMs({ duration: '-1' })).toThrow(
      'duration must be a positive number of seconds.',
    );
    expect(() => resolveDurationMs({ duration: 'abc' })).toThrow(
      'duration must be a positive number of seconds.',
    );
  });

  it('rejects non-positive duration-ms', () => {
    expect(() => resolveDurationMs({ 'duration-ms': '0' })).toThrow(
      'duration-ms must be a positive number.',
    );
    expect(() => resolveDurationMs({ 'duration-ms': '-100' })).toThrow(
      'duration-ms must be a positive number.',
    );
  });
});

describe('validateCaptureDuration', () => {
  it('uses fallback in MCP mode when env is invalid', () => {
    const prev = process.env.CAPTURE_DURATION_MS;
    process.env.CAPTURE_DURATION_MS = 'not-a-number';
    validateCaptureDuration(true);
    expect(getDefaultDurationMs()).toBe(10_000);
    process.env.CAPTURE_DURATION_MS = prev;
  });
});
