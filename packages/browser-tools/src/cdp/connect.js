import { chromium } from 'playwright-core';

const DEFAULT_PORT = 9222;
const DEFAULT_HOST = 'localhost';

/**
 * Connect to an existing Chrome instance over CDP.
 *
 * Follows the same connection pattern as packages/automation/bin/copilot-devtools.js:
 * uses chromium.connectOverCDP with the DevTools HTTP endpoint.
 *
 * The caller is responsible for calling browser.close() after use — this helper
 * is stateless and does not maintain a persistent session.
 *
 * @param {number} [port] - Remote debugging port (default: CHROME_DEBUG_PORT env or 9222)
 * @param {string} [host] - Remote debugging host (default: CHROME_DEBUG_HOST env or localhost)
 * @returns {Promise<import('playwright-core').Browser>}
 */
export async function connectOverCDP(port, host) {
  const _port = port ?? Number(process.env.CHROME_DEBUG_PORT || DEFAULT_PORT);
  const _host = host ?? (process.env.CHROME_DEBUG_HOST || DEFAULT_HOST);
  return chromium.connectOverCDP(`http://${_host}:${_port}`);
}
