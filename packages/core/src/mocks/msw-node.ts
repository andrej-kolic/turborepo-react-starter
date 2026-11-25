/** Runs the mocked todo API in Node, for tests: MSW intercepts `fetch` in the process. */

import { setupServer } from 'msw/node';
import { createHandlers } from './handlers';

/** An MSW server answering the todo API at `baseUrl`, which must be absolute; call `listen()` on it. */
export function createServer(baseUrl: string) {
  return setupServer(...createHandlers(baseUrl));
}
