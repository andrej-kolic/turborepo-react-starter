/**
 * The check behind `dev-tools-check-env-guards`: a bundler app's build output against the env guard
 * lines in packages/web/src/env-guards.ts, Sentry's guard in packages/web/src/optional-features.ts,
 * and the rule that no script links a source map (docs/template/error-reporting.md).
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readBuildScripts, readEagerFiles } from './build-output';
import { workspaceRoot } from './paths';

const PROD_TEXT = 'env-guard:prod';
const ON_TEXT = 'env-guard:on';
const OFF_TEXT = 'env-guard:off';

// The global every Sentry SDK sets up, and a DSN: https://<32-hex public key>@<host>/<project id>.
const SENTRY_TEXT = '__SENTRY__';
const DSN_PATTERN = /https?:\/\/[0-9a-f]{32}@[^\s"'`]+\/\d+/;

// The comment that tells the browser where a script's source map is.
const SOURCE_MAP_COMMENT = /^\/\/[#@] sourceMappingURL=/m;

const GUARD_SOURCE = 'packages/web/src/env-guards.ts';

// The lines env-guards.ts must have, so a build that drops or keeps them proves the guards work.
const GUARD_LINES = [
  `if (import.meta.env.PROD) console.debug('${PROD_TEXT}');`,
  `if (import.meta.env.APP_REACT_GUARD_ON) console.debug('${ON_TEXT}');`,
  `if (import.meta.env.APP_REACT_GUARD_OFF) console.debug('${OFF_TEXT}');`,
];

/**
 * Checks the build in `<appDir>/dist`: code behind PROD (true in every build) and APP_REACT_GUARD_ON (set)
 * must ship, code behind APP_REACT_GUARD_OFF (unset) must be gone. Sentry's code ships only with
 * APP_REACT_SENTRY_DSN set, must ship on a features build (docs/template/build-profiles.md),
 * and never loads before the app starts. No script may link a source map.
 *
 * Also fails when env-guards.ts no longer has all of `GUARD_LINES`, or when there is no dist folder,
 * since the build check would then prove nothing.
 *
 * @returns one message per failure; empty when the build passes
 */
export function checkEnvGuards({
  appDir,
  isFeaturesBuild,
  guardSourcePath = join(workspaceRoot, GUARD_SOURCE),
}: {
  appDir: string;
  isFeaturesBuild: boolean;
  /** env-guards.ts; defaults to web's. */
  guardSourcePath?: string;
}) {
  // Whole lines only: a commented-out guard line must not count.
  const sourceLines = new Set(
    readFileSync(guardSourcePath, 'utf8')
      .split('\n')
      .map((line) => line.trim()),
  );
  const missingLines = GUARD_LINES.filter(
    (guardLine) => !sourceLines.has(guardLine),
  );
  if (missingLines.length > 0) {
    return missingLines.map(
      (guardLine) => `${GUARD_SOURCE} no longer has: ${guardLine}`,
    );
  }

  const app = basename(appDir);
  const distDir = join(appDir, 'dist');
  if (!existsSync(distDir)) {
    return [`${app}: no dist folder: build the app first.`];
  }

  const errors: string[] = [];
  const files = readBuildScripts(distDir);
  const scripts = files.map(({ text }) => text).join('\n');
  if (!scripts.includes(PROD_TEXT)) {
    errors.push(
      `'${PROD_TEXT}' is missing: the build dropped code behind import.meta.env.PROD, which every build sets to true.`,
    );
  }
  if (!scripts.includes(ON_TEXT)) {
    errors.push(
      `'${ON_TEXT}' is missing: the build dropped code behind APP_REACT_GUARD_ON, which packages/web/.env sets to "true".`,
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
      `Sentry's code is missing from a BUILD_PROFILE=features build: packages/web/.env.features sets APP_REACT_SENTRY_DSN, so the build should load Sentry. See docs/template/build-profiles.md.`,
    );
  }
  const eagerFiles = readEagerFiles(distDir, files);
  const eagerSentryFiles = sentryFiles.filter((file) => eagerFiles.has(file));
  if (eagerSentryFiles.length > 0) {
    errors.push(
      `Sentry's code is in ${eagerSentryFiles.join(', ')}, which loads before the app starts: load it with import() instead.`,
    );
  }

  return errors.map((error) => `${app}: ${error}`);
}
