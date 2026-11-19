#!/usr/bin/env node
/**
 * Checks that a bundler app's build loads each page in its own file: no page's component may be in
 * the scripts that run before the app starts (index.html's scripts and their static imports).
 * A page is found by its data-testid, which only its component has.
 * Exits 1 if a page's component is in those scripts, if the app has no dist folder,
 * or if a page's data-testid is missing from the whole build, since the check would then prove nothing.
 *
 * Usage: each bundler app's `check:page-split` script, run in the app's folder by Turbo after its build:
 *   pnpm check:page-split
 */
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readBuildScripts, readEagerFiles } from './build-output.js';

const appDir = process.cwd();
const app = basename(appDir);
const distDir = join(appDir, 'dist');

// Each page's component file (a .lazy.tsx route) and the data-testid only that component renders.
const PAGES = [
  {
    path: '/',
    source: 'packages/app-core/src/components/Scroller/index.tsx',
    testId: 'scroller',
  },
  {
    path: '/about',
    source: 'packages/app-core/src/routes/about.lazy.tsx',
    testId: 'about-page',
  },
  {
    path: '/demo/asset-imports',
    source: 'packages/app-core/src/components/ResourceCards/index.tsx',
    testId: 'resource-cards',
  },
];

if (!existsSync(distDir)) {
  console.error(`✖ ${app}: no dist folder: build the app first.`);
  process.exit(1);
}

const files = readBuildScripts(distDir);
const eagerFiles = readEagerFiles(distDir, files);
const errors = [];

for (const { path, source, testId } of PAGES) {
  // As a string literal in any quotes: Vite's minifier writes backticks, the others double quotes.
  const marker = new RegExp(`["'\`]${testId}["'\`]`);
  const pageFiles = files
    .filter(({ text }) => marker.test(text))
    .map(({ file }) => file);
  if (pageFiles.length === 0) {
    errors.push(
      `no script has '${testId}', the data-testid of ${path} in ${source}: update PAGES in scripts/verify-page-split.js.`,
    );
    continue;
  }
  const eagerPageFiles = pageFiles.filter((file) => eagerFiles.has(file));
  if (eagerPageFiles.length > 0) {
    errors.push(
      `${path}'s component is in ${eagerPageFiles.join(', ')}, which loads before the app starts: keep it in a .lazy.tsx route file and import it only from there.`,
    );
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `✖ ${app}: ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `✓ Page split: ${app} loads ${PAGES.map(({ path }) => path).join(', ')} in their own files.`,
);
