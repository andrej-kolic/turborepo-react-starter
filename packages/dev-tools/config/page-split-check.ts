/**
 * The check behind `dev-tools-check-page-split`: a bundler app's build must load each page in its own file,
 * so no page's component is in the scripts that run before the app starts.
 */
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readBuildScripts, readEagerFiles } from './build-output';

export type Page = { path: string; source: string; testId: string };

/** Each page's component file (a .lazy.tsx route) and the data-testid only that component renders. */
export const PAGES: readonly Page[] = [
  {
    path: '/',
    source: 'packages/web/src/components/Scroller/index.tsx',
    testId: 'scroller',
  },
  {
    path: '/about',
    source: 'packages/web/src/routes/about.lazy.tsx',
    testId: 'about-page',
  },
  {
    path: '/todos',
    source: 'packages/web/src/routes/todos.lazy.tsx',
    testId: 'todos-page',
  },
  {
    path: '/settings',
    source: 'packages/web/src/routes/settings.lazy.tsx',
    testId: 'settings-page',
  },
  {
    path: '/demo/asset-imports',
    source: 'packages/web/src/components/ResourceCards/index.tsx',
    testId: 'resource-cards',
  },
];

/**
 * Checks the build in `<appDir>/dist`: no page's component may be in index.html's scripts or their static imports.
 * A page is found by its data-testid. Also fails when there is no dist folder, or when a page's data-testid
 * is missing from the whole build, since the check would then prove nothing.
 *
 * @returns one message per failure; empty when the build passes
 */
export function checkPageSplit({
  appDir,
  pages = PAGES,
}: {
  appDir: string;
  pages?: readonly Page[];
}) {
  const app = basename(appDir);
  const distDir = join(appDir, 'dist');
  if (!existsSync(distDir)) {
    return [`${app}: no dist folder: build the app first.`];
  }

  const files = readBuildScripts(distDir);
  const eagerFiles = readEagerFiles(distDir, files);
  const errors: string[] = [];

  for (const { path, source, testId } of pages) {
    // As a string literal in any quotes: Vite's minifier writes backticks, the others double quotes.
    const marker = new RegExp(`["'\`]${testId}["'\`]`);
    const pageFiles = files
      .filter(({ text }) => marker.test(text))
      .map(({ file }) => file);
    if (pageFiles.length === 0) {
      errors.push(
        `no script has '${testId}', the data-testid of ${path} in ${source}: update PAGES in packages/dev-tools/config/page-split-check.ts.`,
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

  return errors.map((error) => `${app}: ${error}`);
}
