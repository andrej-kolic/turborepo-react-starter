import fs from 'node:fs';

/**
 * @typedef {import('playwright-core').Request} Request
 * @typedef {import('playwright-core').Response} Response
 * @typedef {{ name: string, value: string }[]} HarHeaders
 * @typedef {{
 *   startedDateTime: string,
 *   time: number,
 *   request: {
 *     method: string,
 *     url: string,
 *     httpVersion: string,
 *     headers: HarHeaders,
 *     queryString: { name: string, value: string }[],
 *     headersSize: number,
 *     bodySize: number,
 *   },
 *   response: {
 *     status: number,
 *     statusText: string,
 *     httpVersion: string,
 *     headers: HarHeaders,
 *     content: { size: number, mimeType: string },
 *     redirectURL: string,
 *     headersSize: number,
 *     bodySize: number,
 *   } | null,
 *   cache: Record<string, never>,
 *   timings: { send: number, wait: number, receive: number },
 * }} HarEntry
 */

/**
 * Records network activity during an attach session into a minimal HAR 1.2 file.
 * Only captures requests that occur while attached — not the full page load history.
 */
export class HarRecorder {
  constructor() {
    /** @type {Map<Request, HarEntry>} */
    this.entries = new Map();
    /** @type {import('playwright-core').Page | null} */
    this.page = null;
  }

  /** @type {((request: Request) => void) | null} */
  #onRequest = null;

  /** @type {((response: Response) => void) | null} */
  #onResponse = null;

  /**
   * Subscribe to request/response events on a page.
   *
   * @param {import('playwright-core').Page} page
   */
  attach(page) {
    this.page = page;
    this.#onRequest = (request) => {
      this.entries.set(request, {
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
    this.#onResponse = (response) => {
      const entry = this.entries.get(response.request());
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

    page.on('request', this.#onRequest);
    page.on('response', this.#onResponse);
  }

  /** Stop listening to page network events. */
  detach() {
    if (!this.page) return;
    if (this.#onRequest) this.page.off('request', this.#onRequest);
    if (this.#onResponse) this.page.off('response', this.#onResponse);
    this.page = null;
  }

  /**
   * Write captured entries to a HAR 1.2 JSON file.
   *
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
