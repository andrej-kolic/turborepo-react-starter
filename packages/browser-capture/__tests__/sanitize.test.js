import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readJson } from '../src/artifact-io/read.js';
import { SAFE_HAR_HEADERS, sanitizeHar } from '../src/sanitize/har.js';
import { sanitizeConsoleLog } from '../src/sanitize/console.js';
import { sanitizeInteractionLog } from '../src/sanitize/interactions.js';
import {
  isSensitiveField,
  redactPii,
  SENSITIVE_FIELD_RE,
} from '../src/sanitize/redact.js';

describe('SAFE_HAR_HEADERS', () => {
  it('allows content-type and user-agent', () => {
    expect(SAFE_HAR_HEADERS.has('content-type')).toBe(true);
    expect(SAFE_HAR_HEADERS.has('user-agent')).toBe(true);
  });

  it('does not allow authorization or cookie', () => {
    expect(SAFE_HAR_HEADERS.has('authorization')).toBe(false);
    expect(SAFE_HAR_HEADERS.has('cookie')).toBe(false);
    expect(SAFE_HAR_HEADERS.has('set-cookie')).toBe(false);
  });
});

describe('redactPii', () => {
  it('redacts email addresses', () => {
    expect(redactPii('Contact user@example.com today')).toBe(
      'Contact [REDACTED-EMAIL] today',
    );
  });

  it('redacts bearer tokens', () => {
    expect(redactPii('Auth: Bearer abc.def.ghi')).toBe(
      'Auth: [REDACTED-BEARER-TOKEN]',
    );
  });

  it('returns non-strings unchanged', () => {
    expect(redactPii(null)).toBe(null);
  });
});

describe('isSensitiveField', () => {
  it.each([
    'password',
    'api_key',
    'api-key',
    'authorization',
    'credit_card',
    'cvv',
  ])('flags %s as sensitive', (name) => {
    expect(isSensitiveField(name)).toBe(true);
  });

  it('does not flag benign field names', () => {
    expect(isSensitiveField('username')).toBe(false);
    expect(isSensitiveField('email')).toBe(false);
  });

  it('matches the documented sensitive field pattern', () => {
    expect(SENSITIVE_FIELD_RE.test('secret_token')).toBe(true);
  });
});

describe('sanitizeHar', () => {
  /** @type {string[]} */
  const tmpDirs = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('redacts non-allowlisted headers and sensitive query params', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'har-sanitize-'));
    tmpDirs.push(dir);
    const harPath = path.join(dir, 'har.json');
    fs.writeFileSync(
      harPath,
      JSON.stringify({
        log: {
          entries: [
            {
              request: {
                headers: [
                  { name: 'Authorization', value: 'Bearer secret' },
                  { name: 'Content-Type', value: 'application/json' },
                ],
                queryString: [
                  { name: 'api_key', value: 'abc123' },
                  { name: 'page', value: '1' },
                ],
                postData: {
                  params: [{ name: 'password', value: 'hunter2' }],
                },
              },
              response: {
                headers: [{ name: 'Set-Cookie', value: 'session=xyz' }],
              },
            },
          ],
        },
      }),
    );

    const result = sanitizeHar(harPath);
    /** @type {unknown} */
    const har = readJson(harPath);

    expect(har).toMatchObject({
      log: {
        entries: [
          {
            request: {
              headers: [{ value: '[REDACTED]' }, { value: 'application/json' }],
              queryString: [{ value: '[REDACTED]' }, { value: '1' }],
              postData: { params: [{ value: '[REDACTED]' }] },
            },
            response: { headers: [{ value: '[REDACTED]' }] },
          },
        ],
      },
    });
    expect(result.headersRedacted).toBe(2);
    expect(result.paramsRedacted).toBe(2);
  });
});

describe('sanitizeConsoleLog', () => {
  /** @type {string[]} */
  const tmpDirs = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('redacts PII in console messages', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-sanitize-'));
    tmpDirs.push(dir);
    const consolePath = path.join(dir, 'console.json');
    fs.writeFileSync(
      consolePath,
      JSON.stringify({
        entries: [{ text: 'Logged in as admin@corp.com', stack: null }],
      }),
    );

    const result = sanitizeConsoleLog(consolePath);
    /** @type {unknown} */
    const data = readJson(consolePath);

    expect(data).toMatchObject({
      entries: [{ text: 'Logged in as [REDACTED-EMAIL]' }],
    });
    expect(result.messagesRedacted).toBe(1);
  });
});

describe('sanitizeInteractionLog', () => {
  /** @type {string[]} */
  const tmpDirs = [];

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fully redacts sensitive fill values and applies PII redaction otherwise', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'interaction-sanitize-'));
    tmpDirs.push(dir);
    const interactionsPath = path.join(dir, 'interactions.json');
    fs.writeFileSync(
      interactionsPath,
      JSON.stringify({
        interactions: [
          {
            type: 'fill',
            element: { name: 'password' },
            value: 'hunter2',
          },
          {
            type: 'fill',
            element: { name: 'notes' },
            value: 'Reach me at user@example.com',
          },
        ],
      }),
    );

    const result = sanitizeInteractionLog(interactionsPath);
    /** @type {unknown} */
    const data = readJson(interactionsPath);

    expect(data).toMatchObject({
      interactions: [
        { value: '[REDACTED]' },
        { value: 'Reach me at [REDACTED-EMAIL]' },
      ],
    });
    expect(result.valuesRedacted).toBe(2);
  });
});
