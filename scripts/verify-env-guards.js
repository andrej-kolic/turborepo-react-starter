#!/usr/bin/env node
/**
 * Checks a bundler app's build output for the env guard lines in packages/app-core/src/env-guards.ts:
 * code behind PROD (true in every build) and APP_REACT_GUARD_ON (set) must ship,
 * code behind APP_REACT_GUARD_OFF (unset) must be gone.
 * Also checks Sentry's guard in packages/app-core/src/optional-features.ts: Sentry's code ships only in a build
 * with APP_REACT_SENTRY_DSN set, and never in the file index.html loads, since it loads after the app.
 * On a BUILD_PROFILE=features build, Sentry's code must ship (docs/template/build-profiles.md).
 * Also checks that no script links a source map: maps go only to Sentry (docs/template/error-reporting.md).
 * Exits 1 if any fails, if the app has no dist folder,
 * or if env-guards.ts no longer has all three guard lines, since the build check would then prove nothing.
 *
 * Usage: each bundler app's `check:env-guards` script, run in the app's folder by Turbo after its build:
 *   pnpm check:env-guards
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = process.cwd();
const app = basename(appDir);
const distDir = join(appDir, 'dist');
const isFeaturesBuild = process.env.BUILD_PROFILE === 'features';

const PROD_TEXT = 'env-guard:prod';
const ON_TEXT = 'env-guard:on';
const OFF_TEXT = 'env-guard:off';

// The global every Sentry SDK sets up, and a DSN: https://<32-hex public key>@<host>/<project id>.
const SENTRY_TEXT = '__SENTRY__';
const DSN_PATTERN = /https?:\/\/[0-9a-f]{32}@[^\s"'`]+\/\d+/;

// The comment that tells the browser where a script's source map is.
const SOURCE_MAP_COMMENT = /^\/\/[#@] sourceMappingURL=/m;

const GUARD_SOURCE = 'packages/app-core/src/env-guards.ts';
const GUARD_LINES = [
  `if (import.meta.env.PROD) console.debug('${PROD_TEXT}');`,
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
    .map((file) => ({
      file,
      text: readFileSync(join(distDir, file), 'utf8'),
    }));
}

// The scripts the page runs before the app starts, as paths relative to dist/: the ones index.html
// loads and, following static imports, every file they import. import() calls are not followed.
function readEagerFiles(distDir, files) {
  const textByFile = new Map(files.map(({ file, text }) => [file, text]));
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const pending = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(
    ([, src]) => normalize(src.replace(/^\//, '')),
  );
  const eager = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (eager.has(file) || !textByFile.has(file)) continue;
    eager.add(file);
    for (const [, specifier] of textByFile
      .get(file)
      .matchAll(/\b(?:from|import)\s*["']([^"']+\.js)["']/g)) {
      // esbuild writes imports from the site root (its publicPath), the others relative to the file.
      pending.push(
        normalize(
          specifier.startsWith('/')
            ? specifier.slice(1)
            : join(dirname(file), specifier),
        ),
      );
    }
  }
  return eager;
}

if (!existsSync(distDir)) {
  console.error(`✖ ${app}: no dist folder: build the app first.`);
  process.exit(1);
}

const errors = [];
const files = readBuildScripts(distDir);
const scripts = files.map(({ text }) => text).join('\n');
if (!scripts.includes(PROD_TEXT)) {
  errors.push(
    `'${PROD_TEXT}' is missing: the build dropped code behind import.meta.env.PROD, which every build sets to true.`,
  );
}
if (!scripts.includes(ON_TEXT)) {
  errors.push(
    `'${ON_TEXT}' is missing: the build dropped code behind APP_REACT_GUARD_ON, which packages/app-core/.env sets to "true".`,
  );
}
if (scripts.includes(OFF_TEXT)) {
  errors.push(
    `'${OFF_TEXT}' still ships: the build kept code behind APP_REACT_GUARD_OFF, which should be unset. See docs/template/env.md.`,
  );
}

const linkedMapFiles = files
  .filter(({ text }) => SOURCE_MAP_COMMENT.test(text))
  .map(({ file }) => file);
if (linkedMapFiles.length > 0) {
  errors.push(
    `${linkedMapFiles.join(', ')} link a source map (sourceMappingURL): build hidden source maps instead. See docs/template/error-reporting.md.`,
  );
}

const sentryFiles = files
  .filter(({ text }) => text.includes(SENTRY_TEXT))
  .map(({ file }) => file);
if (sentryFiles.length > 0 && !DSN_PATTERN.test(scripts)) {
  errors.push(
    `Sentry's code ships in a build without APP_REACT_SENTRY_DSN (${sentryFiles.join(', ')}). See docs/template/error-reporting.md.`,
  );
}
if (isFeaturesBuild && sentryFiles.length === 0) {
  errors.push(
    `Sentry's code is missing from a BUILD_PROFILE=features build: packages/app-core/.env.features sets APP_REACT_SENTRY_DSN, so the build should load Sentry. See docs/template/build-profiles.md.`,
  );
}
const eagerFiles = readEagerFiles(distDir, files);
const eagerSentryFiles = sentryFiles.filter((file) => eagerFiles.has(file));
if (eagerSentryFiles.length > 0) {
  errors.push(
    `Sentry's code is in ${eagerSentryFiles.join(', ')}, which loads before the app starts: load it with import() instead.`,
  );
}

if (errors.length > 0) {
  console.error(errors.map((error) => `✖ ${app}: ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `✓ Env guards: ${app} keeps code behind PROD and a set value, drops it behind an unset one, loads Sentry only with a DSN${isFeaturesBuild ? ' (and has it, on features)' : ''}, after the app, and links no source map.`,
);
