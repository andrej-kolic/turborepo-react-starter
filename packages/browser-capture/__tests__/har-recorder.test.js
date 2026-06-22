import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HarRecorder } from '../src/capture/har-recorder.js';

describe('HarRecorder', () => {
  it('writes a minimal HAR 1.2 document', () => {
    const recorder = new HarRecorder();
    recorder.entries.set('0', {
      startedDateTime: '2026-01-01T00:00:00.000Z',
      time: 0,
      request: {
        method: 'GET',
        url: 'http://localhost/a',
        httpVersion: 'HTTP/1.1',
        headers: [{ name: 'accept', value: 'text/html' }],
        queryString: [],
        headersSize: -1,
        bodySize: -1,
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'HTTP/1.1',
        headers: [{ name: 'content-type', value: 'text/html' }],
        content: { size: 0, mimeType: 'text/html' },
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
      },
      cache: {},
      timings: { send: 0, wait: 0, receive: 0 },
    });

    const harPath = path.join(os.tmpdir(), `har-recorder-${Date.now()}.json`);
    recorder.write(harPath);

    const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
    expect(har.log.version).toBe('1.2');
    expect(har.log.entries).toHaveLength(1);
    fs.unlinkSync(harPath);
  });

  it('retains duplicate requests to the same URL', () => {
    const recorder = new HarRecorder();
    /** @type {Record<string, (payload: object) => void>} */
    const handlers = {};
    const page = {
      on(event, handler) {
        handlers[event] = handler;
      },
      off() {},
    };

    recorder.attach(page);

    const requestA = {
      url: () => 'http://localhost/a',
      method: () => 'GET',
      headers: () => ({ accept: 'text/html' }),
    };
    const requestB = {
      url: () => 'http://localhost/a',
      method: () => 'GET',
      headers: () => ({ accept: 'text/html' }),
    };
    handlers.request?.(requestA);
    handlers.request?.(requestB);
    handlers.response?.({
      request: () => requestA,
      status: () => 200,
      statusText: () => 'OK',
      headers: () => ({ 'content-type': 'text/html' }),
    });
    handlers.response?.({
      request: () => requestB,
      status: () => 200,
      statusText: () => 'OK',
      headers: () => ({ 'content-type': 'text/html' }),
    });

    const harPath = path.join(os.tmpdir(), `har-recorder-${Date.now()}.json`);
    recorder.write(harPath);

    const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
    expect(har.log.entries).toHaveLength(2);
    fs.unlinkSync(harPath);
  });
});
