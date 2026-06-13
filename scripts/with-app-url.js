#!/usr/bin/env node
/**
 * Resolve APP_URL from BUNDLER and inject it into a child command's environment.
 *
 * Resolution order:
 *   1. APP_URL already set → use as-is (allows CI / remote override)
 *   2. BUNDLER set → read devPort from apps/<BUNDLER>/package.json → derive URL
 *   3. Neither set → spawn child without APP_URL (child handles the missing URL)
 *
 * Usage (via pnpm scripts only — do not invoke directly):
 *   node scripts/with-app-url.js <command> [args...]
 *   node scripts/with-app-url.js node scripts/ensure-app.js
 *   node scripts/with-app-url.js browser-tools-setup --url <url>
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function resolveAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;

  const bundler = process.env.BUNDLER;
  if (!bundler) return null;

  const pkgPath = resolve(WORKSPACE_ROOT, 'apps', bundler, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    console.warn(
      `Warning: could not read apps/${bundler}/package.json — APP_URL not set.`,
    );
    return null;
  }

  const port = pkg.devPort;
  if (!Number.isInteger(port) || port <= 0) {
    console.warn(
      `Warning: apps/${bundler}/package.json has no valid devPort — APP_URL not set.`,
    );
    return null;
  }

  return `http://localhost:${port}`;
}

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('Usage: node scripts/with-app-url.js <command> [args...]');
  process.exit(1);
}

const appUrl = resolveAppUrl();
const env = appUrl ? { ...process.env, APP_URL: appUrl } : process.env;

const child = spawn(cmd, args, { stdio: 'inherit', env });

child.on('error', (err) => {
  console.error(`Error: could not start command '${cmd}': ${err.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
