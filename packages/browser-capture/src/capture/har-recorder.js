import fs from 'node:fs';

/**
 * Records network activity during an attach session into a minimal HAR 1.2 file.
 * Only captures requests that occur while attached — not the full page load history.
 */
export class HarRecorder {
  constructor() {
    /** @type {Map<string, object>} */
    this.entries = new Map();
    /** @type {import('playwright-core').Page | null} */
    this.page = null;
    this._onRequest = null;
    this._onResponse = null;
  }

  /**
   * @param {import('playwright-core').Page} page
   */
  attach(page) {
    this.page = page;
    this._onRequest = (request) => {
      this.entries.set(request.url() + request.method(), {
        startedDateTime: new Date().toISOString(),
        time: 0,
        request: {
          method: request.method(),
          url: request.url(),
          httpVersion: 'HTTP/1.1',
          headers: toHarHeaders(request.headers()),
          queryString: [],
          headersSize: -1,
          bodySize: -1,
        },
        response: null,
        cache: {},
        timings: { send: 0, wait: 0, receive: 0 },
      });
    };
    this._onResponse = async (response) => {
      const request = response.request();
      const key = request.url() + request.method();
      const entry = this.entries.get(key);
      if (!entry) return;

      entry.response = {
        status: response.status(),
        statusText: response.statusText(),
        httpVersion: 'HTTP/1.1',
        headers: toHarHeaders(response.headers()),
        content: {
          size: 0,
          mimeType: response.headers()['content-type'] || '',
        },
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
      };
    };

    page.on('request', this._onRequest);
    page.on('response', this._onResponse);
  }

  detach() {
    if (!this.page) return;
    if (this._onRequest) this.page.off('request', this._onRequest);
    if (this._onResponse) this.page.off('response', this._onResponse);
    this.page = null;
  }

  /**
   * @param {string} harPath
   */
  write(harPath) {
    const entries = [...this.entries.values()].filter(
      (entry) => entry.response,
    );
    const har = {
      log: {
        version: '1.2',
        creator: { name: 'browser-capture', version: 'attach-session' },
        entries,
      },
    };
    fs.writeFileSync(harPath, `${JSON.stringify(har, null, 2)}\n`);
  }
}

/**
 * @param {Record<string, string>} headers
 */
function toHarHeaders(headers) {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}
