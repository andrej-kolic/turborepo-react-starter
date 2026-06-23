/**
 * App port / URL resolution from each app's package.json (devPort / previewPort).
 *
 * SSOT: apps/<app>/package.json. Override browser target URL via APP_URL only (not PORT).
 *
 * Public API:
 *   loadAppEndpoints(appDirName) — read apps/<app>/package.json → ports + localhost URLs
 *   resolveAppTargets(env, mode) — dev: APP_URL override else BUNDLER dev targets; preview: BUNDLER preview targets; null if unset
 *   resolveAppUrl(env, mode)     — resolveAppTargets(env, mode)?.url; null if unset; throws if invalid
 *
 * Bundler configs already load their package.json — use pkg.devPort / pkg.previewPort directly.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { workspaceRoot } from './paths';

export interface AppEndpoints {
  devPort: number;
  previewPort: number;
  devUrl: string;
  previewUrl: string;
}

export interface AppTargetsFromEnv {
  url: string;
  port: string;
  source: 'APP_URL' | 'BUNDLER';
}

export type AppTargets = AppTargetsFromEnv & Partial<AppEndpoints>;

/** Target resolution mode: dev uses APP_URL then BUNDLER dev ports; preview uses BUNDLER preview ports only. */
export type AppTargetMode = 'dev' | 'preview';

type AppPortField = 'devPort' | 'previewPort';

function readPort(pkg: Record<string, unknown>, field: AppPortField): number {
  const port: unknown = pkg[field];
  if (typeof port !== 'number' || !Number.isInteger(port) || port <= 0) {
    throw new Error(`package.json has no valid ${field}`);
  }
  return port;
}

function localhostUrl(port: number): string {
  return `http://localhost:${port}`;
}

function portFromUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`APP_URL is not a valid URL: ${url}`);
  }
  if (parsed.port) return parsed.port;
  if (parsed.protocol === 'https:') return '443';
  if (parsed.protocol === 'http:') return '80';
  throw new Error(`APP_URL has no resolvable port: ${url}`);
}

/**
 * Read devPort and previewPort from apps/<appDirName>/package.json and return localhost URLs.
 * Throws if the file is missing or ports are invalid.
 *
 * @param appDirName e.g. app-vite, ui-storybook
 */
export function loadAppEndpoints(
  appDirName: string,
  root = workspaceRoot,
): AppEndpoints {
  const pkgPath = resolve(root, 'apps', appDirName, 'package.json');
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Record<string, unknown>;
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
 * Resolve the active app URL and port for browser tooling / CI.
 *
 * Dev mode (`mode: 'dev'`):
 *   1. APP_URL set → use as-is (port from URL, default 80/443 when omitted)
 *   2. BUNDLER set → devUrl / devPort from apps/<BUNDLER>/package.json
 *   3. else → null
 *
 * Preview mode (`mode: 'preview'`):
 *   1. BUNDLER set → previewUrl / previewPort from apps/<BUNDLER>/package.json
 *   2. else → null
 *
 * APP_URL applies to dev mode only; preview always uses BUNDLER endpoints.
 *
 * Returns null when required env is unset.
 * Throws when env is set but invalid (bad URL, unknown bundler, missing/invalid package.json).
 */
export function resolveAppTargets(
  env: NodeJS.ProcessEnv = process.env,
  mode: AppTargetMode = 'dev',
): AppTargets | null {
  if (mode === 'dev' && env.APP_URL) {
    const url = env.APP_URL;
    const port = portFromUrl(url);
    return {
      url,
      port,
      source: 'APP_URL',
    };
  }

  const bundler = env.BUNDLER;
  if (!bundler) return null;

  const endpoints = loadAppEndpoints(bundler);
  if (mode === 'preview') {
    return {
      url: endpoints.previewUrl,
      port: String(endpoints.previewPort),
      source: 'BUNDLER',
      ...endpoints,
    };
  }

  return {
    url: endpoints.devUrl,
    port: String(endpoints.devPort),
    source: 'BUNDLER',
    ...endpoints,
  };
}

/**
 * Convenience wrapper around resolveAppTargets that returns only the URL, or null when required env is unset.
 * Propagates throws from invalid APP_URL, unknown BUNDLER, or bad package.json.
 */
export function resolveAppUrl(
  env: NodeJS.ProcessEnv = process.env,
  mode: AppTargetMode = 'dev',
): string | null {
  return resolveAppTargets(env, mode)?.url ?? null;
}
