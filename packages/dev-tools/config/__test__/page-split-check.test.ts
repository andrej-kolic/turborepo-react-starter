import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { checkPageSplit } from '../page-split-check';
import { createApp } from './build-fixture';

const PAGES = [
  {
    path: '/about',
    source: 'packages/app-core/src/routes/about.lazy.tsx',
    testId: 'about-page',
  },
];

let tempDir: string | undefined;

function check(files: Record<string, string>) {
  const app = createApp({ files });
  tempDir = app.tempDir;
  return checkPageSplit({ appDir: app.appDir, pages: PAGES });
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('checkPageSplit', () => {
  it('passes when the page is only in a file loaded with import()', () => {
    expect(
      check({
        'assets/index.js': 'import("./about.js");',
        'assets/about.js': '{"data-testid":"about-page"}',
      }),
    ).toEqual([]);
  });

  it('finds the data-testid in backticks, as Vite minifies it', () => {
    expect(
      check({
        'assets/index.js': 'import("./about.js");',
        'assets/about.js': '{"data-testid":`about-page`}',
      }),
    ).toEqual([]);
  });

  it('fails when the page is in a file that loads before the app starts', () => {
    expect(
      check({
        'assets/index.js': 'import "./about.js";',
        'assets/about.js': '{"data-testid":"about-page"}',
      }),
    ).toEqual([
      "app-test: /about's component is in assets/about.js, which loads before the app starts: keep it in a .lazy.tsx route file and import it only from there.",
    ]);
  });

  it('fails when no script has the page data-testid', () => {
    expect(check({ 'assets/index.js': 'main' })).toEqual([
      "app-test: no script has 'about-page', the data-testid of /about in packages/app-core/src/routes/about.lazy.tsx: update PAGES in packages/dev-tools/config/page-split-check.ts.",
    ]);
  });

  it('fails when the app has no dist folder', () => {
    const app = createApp({ files: {} });
    tempDir = app.tempDir;
    rmSync(app.distDir, { recursive: true });

    expect(checkPageSplit({ appDir: app.appDir, pages: PAGES })).toEqual([
      'app-test: no dist folder: build the app first.',
    ]);
  });
});
