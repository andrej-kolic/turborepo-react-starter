import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkEnvGuards } from '../env-guards-check';
import { createApp } from './build-fixture';

const GUARDED =
  "console.debug('env-guard:prod');console.debug('env-guard:on');";
const DSN = 'https://0123456789abcdef0123456789abcdef@o1.ingest.sentry.io/42';

let tempDir: string | undefined;

function check(
  files: Record<string, string>,
  {
    isFeaturesBuild = false,
    guardSource,
  }: { isFeaturesBuild?: boolean; guardSource?: string } = {},
) {
  const app = createApp({ files });
  tempDir = app.tempDir;
  let guardSourcePath: string | undefined;
  if (guardSource !== undefined) {
    guardSourcePath = join(app.tempDir, 'env-guards.ts');
    writeFileSync(guardSourcePath, guardSource);
  }
  return checkEnvGuards({
    appDir: app.appDir,
    isFeaturesBuild,
    guardSourcePath,
  });
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('checkEnvGuards', () => {
  it('passes a build that keeps the set guards and has no Sentry, reading web env-guards.ts', () => {
    expect(check({ 'assets/index.js': GUARDED })).toEqual([]);
  });

  it('fails when env-guards.ts no longer has a guard line', () => {
    const errors = check(
      { 'assets/index.js': GUARDED },
      {
        guardSource: [
          "if (import.meta.env.PROD) console.debug('env-guard:prod');",
          "// if (import.meta.env.APP_REACT_GUARD_ON) console.debug('env-guard:on');",
          "if (import.meta.env.APP_REACT_GUARD_OFF) console.debug('env-guard:off');",
        ].join('\n'),
      },
    );

    expect(errors).toEqual([
      "packages/web/src/env-guards.ts no longer has: if (import.meta.env.APP_REACT_GUARD_ON) console.debug('env-guard:on');",
    ]);
  });

  it('fails when the app has no dist folder', () => {
    const app = createApp({ files: {} });
    tempDir = app.tempDir;
    rmSync(app.distDir, { recursive: true });

    expect(
      checkEnvGuards({ appDir: app.appDir, isFeaturesBuild: false }),
    ).toEqual(['app-test: no dist folder: build the app first.']);
  });

  it('fails when code behind PROD or a set value was dropped', () => {
    const errors = check({ 'assets/index.js': 'nothing' });

    expect(errors).toEqual([
      expect.stringContaining("'env-guard:prod' is missing"),
      expect.stringContaining("'env-guard:on' is missing"),
    ]);
  });

  it('fails when code behind an unset value ships', () => {
    const errors = check({
      'assets/index.js': `${GUARDED}console.debug('env-guard:off');`,
    });

    expect(errors).toEqual([
      expect.stringContaining("'env-guard:off' still ships"),
    ]);
  });

  it('fails when a script links its source map, and names the file', () => {
    const errors = check({
      'assets/index.js': `${GUARDED}\n//# sourceMappingURL=index.js.map`,
    });

    expect(errors).toEqual([
      'app-test: assets/index.js link a source map (sourceMappingURL): build hidden source maps instead. See docs/template/error-reporting.md.',
    ]);
  });

  it('fails when Sentry ships without a DSN', () => {
    const errors = check({
      'assets/index.js': `${GUARDED}import("./sentry.js");`,
      'assets/sentry.js': 'globalThis.__SENTRY__={};',
    });

    expect(errors).toEqual([
      expect.stringContaining(
        "Sentry's code ships in a build without APP_REACT_SENTRY_DSN (assets/sentry.js)",
      ),
    ]);
  });

  it('fails when Sentry loads before the app starts', () => {
    const errors = check({
      'assets/index.js': `${GUARDED}import "./sentry.js";`,
      'assets/sentry.js': `globalThis.__SENTRY__={dsn:"${DSN}"};`,
    });

    expect(errors).toEqual([
      expect.stringContaining(
        "Sentry's code is in assets/sentry.js, which loads before the app starts",
      ),
    ]);
  });

  it('fails when a static import loads MSW', () => {
    const errors = check({
      'assets/index.js': `${GUARDED}import "./msw-browser.js";`,
      'assets/msw-browser.js': 'worker.postMessage("MOCKING_ENABLED");',
    });

    expect(errors).toEqual([
      expect.stringContaining(
        "MSW's code is in assets/msw-browser.js, which the page loads without import()",
      ),
    ]);
  });

  it('passes a build that loads MSW through import()', () => {
    const errors = check({
      'assets/index.js': `${GUARDED}import("./msw-browser.js");`,
      'assets/msw-browser.js': 'worker.postMessage("MOCKING_ENABLED");',
    });

    expect(errors).toEqual([]);
  });

  it('fails a features build without Sentry', () => {
    const errors = check(
      { 'assets/index.js': GUARDED },
      { isFeaturesBuild: true },
    );

    expect(errors).toEqual([
      expect.stringContaining(
        "Sentry's code is missing from a BUILD_PROFILE=features build",
      ),
    ]);
  });

  it('passes a features build that loads Sentry with a DSN after the app', () => {
    const errors = check(
      {
        'assets/index.js': `${GUARDED}import("./sentry.js");`,
        'assets/sentry.js': `globalThis.__SENTRY__={dsn:"${DSN}"};`,
      },
      { isFeaturesBuild: true },
    );

    expect(errors).toEqual([]);
  });
});
