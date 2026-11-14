#!/usr/bin/env node
/**
 * Checks each bundler's build output for the env guard lines in packages/app-core/src/index.tsx:
 * code behind APP_REACT_GUARD_ON (set) must ship, code behind APP_REACT_GUARD_OFF (unset) must be gone.
 * Exits 1 if either fails in any bundler app's dist folder, if no app has been built,
 * or if index.tsx no longer has both guard lines, since the build check would then prove nothing.
 *
 * Usage, after a build:
 *   node scripts/verify-env-guards.js
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'apps');

const ON_TEXT = 'env-guard:on';
const OFF_TEXT = 'env-guard:off';

const GUARD_SOURCE = 'packages/app-core/src/index.tsx';
const GUARD_LINES = [
  `if (import.meta.env.APP_REACT_GUARD_ON) console.debug('${ON_TEXT}');`,
  `if (import.meta.env.APP_REACT_GUARD_OFF) console.debug('${OFF_TEXT}');`,
];

// Whole lines only: a commented-out guard line must not count.
const sourceLines = new Set(
  readFileSync(join(root, GUARD_SOURCE), 'utf8')
    .split('\n')
    .map((line) => line.trim()),
);
const missingLines = GUARD_LINES.filter(
  (guardLine) => !sourceLines.has(guardLine),
);
if (missingLines.length > 0) {
  console.error(
    missingLines
      .map((guardLine) => `✖ ${GUARD_SOURCE} no longer has: ${guardLine}`)
      .join('\n'),
  );
  process.exit(1);
}

// JavaScript only: a source map holds the original source, with both lines in it.
function readBuildScripts(distDir) {
  return readdirSync(distDir, { recursive: true })
    .filter((file) => /\.[cm]?js$/.test(file))
    .map((file) => readFileSync(join(distDir, file), 'utf8'))
    .join('\n');
}

const builds = readdirSync(appsDir)
  .filter((app) => app.startsWith('app-'))
  .map((app) => ({ app, distDir: join(appsDir, app, 'dist') }))
  .filter(({ distDir }) => existsSync(distDir));

if (builds.length === 0) {
  console.error('✖ No apps/app-*/dist found: build an app first.');
  process.exit(1);
}

const errors = [];
for (const { app, distDir } of builds) {
  const scripts = readBuildScripts(distDir);
  if (!scripts.includes(ON_TEXT)) {
    errors.push(
      `${app}: '${ON_TEXT}' is missing: the build dropped code behind APP_REACT_GUARD_ON, which packages/app-core/.env sets to "true".`,
    );
  }
  if (scripts.includes(OFF_TEXT)) {
    errors.push(
      `${app}: '${OFF_TEXT}' still ships: the build kept code behind APP_REACT_GUARD_OFF, which should be unset. See docs/template/env.md.`,
    );
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `✖ ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `✓ Env guards: ${builds.map(({ app }) => app).join(', ')} keep code behind a set value and drop it behind an unset one.`,
);
