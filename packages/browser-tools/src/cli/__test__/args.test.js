import { describe, expect, it } from 'vitest';
import {
  isTruthyFlag,
  parseArgs,
  screenshotOptions,
  sharedOptions,
} from '../args.js';

describe('parseArgs', () => {
  it('parses options and boolean flags', () => {
    const { options } = parseArgs([
      '--url',
      'http://localhost:5173',
      '--selector',
      '[data-testid=app-header]',
      '--expect',
      '--no-console-errors',
    ]);

    expect(options.url).toBe('http://localhost:5173');
    expect(options.selector).toBe('[data-testid=app-header]');
    expect(options.expect).toBe(true);
    expect(options['no-console-errors']).toBe(true);
  });

  it('parses inline --key=value', () => {
    const { options } = parseArgs(['--url=http://localhost:5173', '--json']);
    expect(options.url).toBe('http://localhost:5173');
    expect(options.json).toBe(true);
  });

  it('collects positionals', () => {
    const { positionals } = parseArgs(['spec.yaml', '--url', 'http://x.test']);
    expect(positionals).toEqual(['spec.yaml']);
  });
});

describe('isTruthyFlag', () => {
  it.each([
    [true, true],
    ['true', true],
    ['1', true],
    [false, false],
    ['false', false],
    [undefined, false],
  ])('isTruthyFlag(%j) → %s', (input, expected) => {
    expect(isTruthyFlag(input)).toBe(expected);
  });
});

describe('sharedOptions', () => {
  it('maps selector and --no-console-errors', () => {
    expect(
      sharedOptions({
        selector: 'h1',
        'no-console-errors': true,
      }),
    ).toEqual({
      selector: 'h1',
      noConsoleErrors: true,
    });
  });
});

describe('screenshotOptions', () => {
  it('defaults to base64 when no output path', () => {
    expect(screenshotOptions({}, null)).toEqual({
      useBase64: true,
      fullPage: false,
      format: 'png',
    });
  });

  it('writes to file without base64 when output is set', () => {
    expect(screenshotOptions({}, '/tmp/shot.png')).toEqual({
      useBase64: false,
      fullPage: false,
      format: 'png',
    });
  });

  it('normalizes jpeg format aliases', () => {
    expect(screenshotOptions({ format: 'jpg' }, null).format).toBe('jpeg');
  });
});
