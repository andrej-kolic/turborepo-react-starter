/**
 * Resolve APP_URL from BUNDLER and inject it into a child command's environment.
 *
 * Resolution order (see ../config/app-port):
 *   1. APP_URL already set → use as-is (allows CI / remote override)
 *   2. BUNDLER set → devUrl from apps/<BUNDLER>/package.json via resolveAppTargets()
 *   3. Neither set → spawn child without APP_URL (child handles the missing URL)
 *
 * Invoked via `dev-tools-with-app-url` (bin/with-app-url.js → run-ts.js).
 */

import { spawn } from 'node:child_process';
import { resolveAppUrl } from '../config/app-port.js';

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('Usage: dev-tools-with-app-url <command> [args...]');
  process.exit(1);
}

let appUrl: string | null;
try {
  appUrl = resolveAppUrl(process.env);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
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
