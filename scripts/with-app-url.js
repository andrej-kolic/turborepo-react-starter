#!/usr/bin/env node
/**
 * Resolve APP_URL from BUNDLER and inject it into a child command's environment.
 *
 * Resolution order (see @repo/dev-tools/config/app-port.js):
 *   1. APP_URL already set → use as-is (allows CI / remote override)
 *   2. BUNDLER set → devUrl from apps/<BUNDLER>/package.json via resolveAppTargets()
 *   3. Neither set → spawn child without APP_URL (child handles the missing URL)
 *
 * Usage (via pnpm scripts only — do not invoke directly):
 *   node scripts/with-app-url.js <command> [args...]
 *   node scripts/with-app-url.js node scripts/ensure-app.js
 *   node scripts/with-app-url.js browser-tools-setup --url <url>
 */

import { spawn } from 'node:child_process';
import { resolveAppUrl } from '../packages/dev-tools/config/app-port.js';

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('Usage: node scripts/with-app-url.js <command> [args...]');
  process.exit(1);
}

const appUrl = resolveAppUrl(process.env);
if (!appUrl && process.env.BUNDLER) {
  console.warn(
    `Warning: could not resolve APP_URL for BUNDLER=${process.env.BUNDLER} — APP_URL not set.`,
  );
}

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
