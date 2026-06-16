/**
 * App port / URL resolution from each app's package.json (devPort / previewPort).
 *
 * SSOT: apps/<app>/package.json. Override browser target URL via APP_URL only (not PORT).
 *
 * Public API:
 *   loadAppEndpoints(appDirName) — read apps/<app>/package.json → ports + localhost URLs
 *   resolveAppTargets(env)       — APP_URL override, else BUNDLER dev targets (url + port)
 *   resolveAppUrl(env)           — resolveAppTargets(env)?.url (browser wrapper convenience)
 *
 * Bundler configs already load their package.json — use pkg.devPort / pkg.previewPort directly.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV_TOOLS_CONFIG_DIR = dirname(fileURLToPath(import.meta.url));
// TODO: extract to paths.ts
const WORKSPACE_ROOT = resolve(DEV_TOOLS_CONFIG_DIR, '../../..');

/** @typedef {'devPort' | 'previewPort'} AppPortField */

/**
 * @typedef {Object} AppEndpoints
 * @property {number} devPort
 * @property {number} previewPort
 * @property {string} devUrl
 * @property {string} previewUrl
 */

/**
 * @typedef {AppEndpoints & { url: string, port: string, source: 'APP_URL' | 'BUNDLER' }} AppTargets
 */

/**
 * @param {Record<string, unknown>} pkg
 * @param {AppPortField} field
 * @returns {number}
 */
function readPort(pkg, field) {
  const port = pkg[field];
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`package.json has no valid ${field}`);
  }
  return port;
}

/**
 * @param {number} port
 * @returns {string}
 */
function localhostUrl(port) {
  return `http://localhost:${port}`;
}

/**
 * @param {string} appDirName  e.g. app-vite, ui-storybook
 * @param {string} [workspaceRoot]
 * @returns {AppEndpoints}
 */
export function loadAppEndpoints(appDirName, workspaceRoot = WORKSPACE_ROOT) {
  const pkgPath = resolve(workspaceRoot, 'apps', appDirName, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    throw new Error(`could not read apps/${appDirName}/package.json`);
  }

  const devPort = readPort(pkg, 'devPort');
  const previewPort = readPort(pkg, 'previewPort');

  return {
    devPort,
    previewPort,
    devUrl: localhostUrl(devPort),
    previewUrl: localhostUrl(previewPort),
  };
}

/**
 * Resolve the active dev-server URL and port for browser tooling / CI.
 *
 * Resolution order:
 *   1. APP_URL set → use as-is (port from URL)
 *   2. BUNDLER set → devUrl / devPort from apps/<BUNDLER>/package.json
 *   3. else → null
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {AppTargets | null}
 */
export function resolveAppTargets(env = process.env) {
  if (env.APP_URL) {
    const url = env.APP_URL;
    return {
      url,
      port: new URL(url).port,
      source: 'APP_URL',
    };
  }

  const bundler = env.BUNDLER;
  if (!bundler) return null;

  try {
    const endpoints = loadAppEndpoints(bundler);
    return {
      url: endpoints.devUrl,
      port: String(endpoints.devPort),
      source: 'BUNDLER',
      ...endpoints,
    };
  } catch {
    return null;
  }
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | null}
 */
export function resolveAppUrl(env = process.env) {
  return resolveAppTargets(env)?.url ?? null;
}
