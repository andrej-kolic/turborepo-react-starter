/**
 * Print the preview-server port for the current BUNDLER env.
 * Used by CI perf workflows and other shell scripts — prefer over inline node -e imports.
 *
 * Exits non-zero when port cannot be resolved (no silent fallback).
 *
 * Invoked via `dev-tools-print-preview-port` (bin/print-preview-port.js → run-ts.js).
 */

import { loadAppEndpoints } from '../config/app-port';

const bundler = process.env.BUNDLER;
if (!bundler) {
  console.error(
    'Error: could not resolve preview port.\n' +
      '  Set BUNDLER (e.g. app-vite) before invoking dev-tools-print-preview-port.',
  );
  process.exit(1);
}

try {
  const { previewPort } = loadAppEndpoints(bundler);
  console.log(previewPort);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
}
