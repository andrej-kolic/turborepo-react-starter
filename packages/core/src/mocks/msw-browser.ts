/** Runs the mocked todo API in a browser page, through MSW's service worker (`mockServiceWorker.js`, served by the app). */

import { setupWorker } from 'msw/browser';
import { createHandlers } from './handlers';

/** An MSW worker answering the todo API at `baseUrl`; call `start()` on it. */
export function createWorker(baseUrl: string) {
  return setupWorker(...createHandlers(baseUrl));
}
