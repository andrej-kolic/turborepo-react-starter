/**
 * Check that a bundler app's build loads each page in its own file.
 *
 * Usage: each bundler app's `check:page-split` script, run in the app's folder by Turbo after its build:
 *   dev-tools-check-page-split
 *
 * Exits 1 if any check fails. Invoked via `dev-tools-check-page-split` (bin/check-page-split.js → run-ts.js).
 */

import { basename } from 'node:path';
import { PAGES, checkPageSplit } from '../config/page-split-check';

const appDir = process.cwd();
const errors = checkPageSplit({ appDir });

if (errors.length > 0) {
  console.error(errors.map((error) => `✖ ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `✓ Page split: ${basename(appDir)} loads ${PAGES.map(({ path }) => path).join(', ')} in their own files.`,
);
