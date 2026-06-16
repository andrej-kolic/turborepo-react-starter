/**
 * App port / URL resolution from each app's package.json (devPort / previewPort).
 *
 * SSOT: apps/<app>/package.json. Override browser target URL via APP_URL only (not PORT).
 *
 * Public API:
 *   loadAppEndpoints(appDirName) — read apps/<app>/package.json → ports + localhost URLs
 *   resolveAppTargets(env)       — APP_URL override, else BUNDLER dev targets; null if unset; throws if invalid
 *   resolveAppUrl(env)           — resolveAppTargets(env)?.url; null if unset; throws if invalid
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

/** @param appDirName e.g. app-vite, ui-storybook */
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
 * Resolve the active dev-server URL and port for browser tooling / CI.
 *
 * Resolution order:
 *   1. APP_URL set → use as-is (port from URL)
 *   2. BUNDLER set → devUrl / devPort from apps/<BUNDLER>/package.json
 *   3. else → null
 *
 * Returns null when neither APP_URL nor BUNDLER is set.
 * Throws when env is set but invalid (bad URL, unknown bundler, missing/invalid package.json).
 */
export function resolveAppTargets(
  env: NodeJS.ProcessEnv = process.env,
): AppTargets | null {
  if (env.APP_URL) {
    const url = env.APP_URL;
    let port: string;
    try {
      port = new URL(url).port;
    } catch {
      throw new Error(`APP_URL is not a valid URL: ${url}`);
    }
    return {
      url,
      port,
      source: 'APP_URL',
    };
  }

  const bundler = env.BUNDLER;
  if (!bundler) return null;

  const endpoints = loadAppEndpoints(bundler);
  return {
    url: endpoints.devUrl,
    port: String(endpoints.devPort),
    source: 'BUNDLER',
    ...endpoints,
  };
}

export function resolveAppUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return resolveAppTargets(env)?.url ?? null;
}
