import { DEFAULT_HOST, DEFAULT_PORT } from './constants.js';

/**
 * @param {number} [port]
 * @param {string} [host]
 * @returns {{ port: number, host: string, baseUrl: string }}
 */
export function resolveCdpEndpoint(port, host) {
  const _port = port ?? Number(process.env.CHROME_DEBUG_PORT || DEFAULT_PORT);
  const _host = host ?? (process.env.CHROME_DEBUG_HOST || DEFAULT_HOST);
  return { port: _port, host: _host, baseUrl: `http://${_host}:${_port}` };
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
