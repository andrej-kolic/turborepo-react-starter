/**
 * App port / URL resolution from each app's package.json (devPort / previewPort).
 *
 * SSOT: apps/<app>/package.json. Override browser target URL via TARGET_URL (ephemeral — not in `.env`).
 *
 * Public API:
 *   loadAppEndpoints(appDirName) — read apps/<app>/package.json → ports + localhost URLs
 *   resolveAppTargets(env, mode) — TARGET_URL override else BUNDLER mode defaults; null if unset
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
  source: 'TARGET_URL' | 'BUNDLER';
}

export type AppTargets = AppTargetsFromEnv & Partial<AppEndpoints>;

/** Target resolution mode: dev uses devPort defaults; preview uses previewPort defaults. Override applies in both. */
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

function readTargetUrl(env: NodeJS.ProcessEnv): string | undefined {
  return env.TARGET_URL;
}

function portFromUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`TARGET_URL is not a valid URL: ${url}`);
  }
  if (parsed.port) return parsed.port;
  if (parsed.protocol === 'https:') return '443';
  if (parsed.protocol === 'http:') return '80';
  throw new Error(`TARGET_URL has no resolvable port: ${url}`);
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
 * Resolution order (all modes):
 *   1. TARGET_URL set → use as-is (port from URL, default 80/443 when omitted)
 *   2. mode === 'dev' and BUNDLER set → devUrl / devPort from apps/<BUNDLER>/package.json
 *   3. mode === 'preview' and BUNDLER set → previewUrl / previewPort from apps/<BUNDLER>/package.json
 *   4. else → null
 *
 * Returns null when required env is unset.
 * Throws when env is set but invalid (bad URL, unknown bundler, missing/invalid package.json).
 */
export function resolveAppTargets(
  env: NodeJS.ProcessEnv = process.env,
  mode: AppTargetMode = 'dev',
): AppTargets | null {
  const overrideUrl = readTargetUrl(env);
  if (overrideUrl) {
    const port = portFromUrl(overrideUrl);
    return {
      url: overrideUrl,
      port,
      source: 'TARGET_URL',
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
 * Propagates throws from invalid TARGET_URL, unknown BUNDLER, or bad package.json.
 */
export function resolveAppUrl(
  env: NodeJS.ProcessEnv = process.env,
  mode: AppTargetMode = 'dev',
): string | null {
  return resolveAppTargets(env, mode)?.url ?? null;
}

function isLocalhostHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Warn when a shell-exported localhost TARGET_URL overrides the BUNDLER default for this mode.
 * Skips remote URLs (intentional deploy overrides) and when TARGET_URL already matches the default.
 */
export function warnIfStaleLocalTargetUrlOverride(
  env: NodeJS.ProcessEnv = process.env,
  mode: AppTargetMode = 'dev',
  warn: (message: string) => void = (message) => console.warn(message),
): void {
  if (!env.TARGET_URL || !env.BUNDLER) return;

  const envWithoutOverride = { ...env };
  delete envWithoutOverride.TARGET_URL;
  const modeDefault = resolveAppTargets(envWithoutOverride, mode);
  if (!modeDefault || modeDefault.url === env.TARGET_URL) return;

  let parsed: URL;
  try {
    parsed = new URL(env.TARGET_URL);
  } catch {
    return;
  }

  if (!isLocalhostHost(parsed.hostname)) return;

  warn(
    `Warning: TARGET_URL (${env.TARGET_URL}) overrides ${mode} default (${modeDefault.url}). Unset TARGET_URL to use the BUNDLER ${mode} default.`,
  );
}
