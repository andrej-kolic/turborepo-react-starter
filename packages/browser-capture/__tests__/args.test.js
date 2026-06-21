import { beforeEach, describe, expect, it } from 'vitest';
import { parseArgs, requireUrl, resolveDurationMs } from '../src/cli/args.js';
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
});

describe('requireUrl', () => {
  it('returns the url when provided', () => {
    expect(requireUrl('record-trace', 'http://localhost:5173')).toBe(
      'http://localhost:5173',
    );
  });

  it('throws when url is missing', () => {
    expect(() => requireUrl('record-trace', undefined)).toThrow(
      'record-trace requires a URL.',
    );
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
