import { DEFAULT_HOST, DEFAULT_PORT } from './constants.js';

/**
 * Resolve CDP host, port, and base URL from args or environment.
 *
 * @param {number} [port]
 * @param {string} [host]
 * @returns {{ port: number, host: string, baseUrl: string }}
 */
export function resolveCdpEndpoint(port, host) {
  const resolvedPort =
    port ?? Number(process.env.CHROME_DEBUG_PORT || DEFAULT_PORT);
  const resolvedHost = host ?? (process.env.CHROME_DEBUG_HOST || DEFAULT_HOST);
  return {
    port: resolvedPort,
    host: resolvedHost,
    baseUrl: `http://${resolvedHost}:${resolvedPort}`,
  };
}

/**
 * Fetch JSON from the Chrome DevTools HTTP API (e.g. /json/version, /json/list).
 *
 * @param {string} path
 * @param {number} [port]
 * @param {string} [host]
 * @returns {Promise<unknown>}
 */
export async function fetchCdpJson(path, port, host) {
  const { baseUrl } = resolveCdpEndpoint(port, host);
  const pathname = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${pathname}`);

  if (!response.ok) {
    throw new Error(`GET ${pathname} failed with status ${response.status}`);
  }

  return response.json();
}
