/**
 * Upload a build's source maps to Sentry, then delete them, before the deploy publishes the build.
 *
 * Usage:
 *   dev-tools-sentry-sourcemaps <dist-dir>
 *
 * Exits 1 only if a `.map` is left; a failed upload warns, and without Sentry credentials it skips the upload.
 * Invoked via `dev-tools-sentry-sourcemaps` (bin/sentry-sourcemaps.js → run-ts.js).
 */

import path from 'node:path';
import { uploadSourceMaps } from '../config/sentry-sourcemaps';

const [distDir] = process.argv.slice(2);
if (!distDir) {
  console.error('Usage: dev-tools-sentry-sourcemaps <dist-dir>');
  process.exit(1);
}

process.exit(uploadSourceMaps({ distDir: path.resolve(distDir) }) ? 0 : 1);
