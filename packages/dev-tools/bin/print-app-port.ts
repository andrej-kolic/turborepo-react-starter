/**
 * Print the resolved dev-server port for the current BUNDLER / APP_URL env.
 * Used by CI cleanup and other shell scripts — prefer over inline node -e imports.
 *
 * Exits non-zero when port cannot be resolved (no silent fallback).
 *
 * Invoked via `dev-tools-print-app-port` (bin/print-app-port.js → run-ts.js).
 */

import { resolveAppTargets } from '../config/app-port';

let targets;
try {
  targets = resolveAppTargets(process.env);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
}

if (!targets?.port) {
  console.error(
    'Error: could not resolve dev port.\n' +
      '  Set BUNDLER (e.g. app-vite) or APP_URL before invoking dev-tools-print-app-port.',
  );
  process.exit(1);
}

console.log(targets.port);
