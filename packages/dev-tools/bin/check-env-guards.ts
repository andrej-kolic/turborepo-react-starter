/**
 * Check a bundler app's build output for its env guards, Sentry's guard and linked source maps.
 *
 * Usage: each bundler app's `check:env-guards` script, run in the app's folder by Turbo after its build:
 *   dev-tools-check-env-guards
 *
 * Exits 1 if any check fails. Invoked via `dev-tools-check-env-guards` (bin/check-env-guards.js → run-ts.js).
 */

import { basename } from 'node:path';
import { checkEnvGuards } from '../config/env-guards-check';

const appDir = process.cwd();
const isFeaturesBuild = process.env.BUILD_PROFILE === 'features';
const errors = checkEnvGuards({ appDir, isFeaturesBuild });

if (errors.length > 0) {
  console.error(errors.map((error) => `✖ ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `✓ Env guards: ${basename(appDir)} keeps code behind PROD and a set value, drops it behind an unset one, loads Sentry only with a DSN${isFeaturesBuild ? ' (and has it, on features)' : ''}, after the app, and links no source map.`,
);
