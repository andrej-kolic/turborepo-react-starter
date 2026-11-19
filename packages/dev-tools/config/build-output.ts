/**
 * Reads a bundler app's build output for the checks that run on it after the build:
 * env-guards-check.ts and page-split-check.ts.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

export type BuildFile = { file: string; text: string };

/**
 * The build's JavaScript files, with paths relative to `distDir`.
 * Source maps are left out: they hold the original source, so searching them would find text the build dropped.
 */
export function readBuildScripts(distDir: string) {
  return readdirSync(distDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.[cm]?js$/.test(file))
    .map((file): BuildFile => ({
      file,
      text: readFileSync(join(distDir, file), 'utf8'),
    }));
}

// Each match's first group. Both patterns' groups are required, so the default never applies;
// it only satisfies noUncheckedIndexedAccess.
function firstGroups(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].map(([, group = '']) => group);
}

/**
 * The scripts the page runs before the app starts, as paths relative to `distDir`: the ones
 * index.html loads and, following static imports, every file they import. `import()` calls are not followed.
 */
export function readEagerFiles(distDir: string, files: readonly BuildFile[]) {
  const textByFile = new Map(files.map(({ file, text }) => [file, text]));
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const pending = firstGroups(html, /<script[^>]*\ssrc="([^"]+)"/g).map((src) =>
    normalize(src.replace(/^\//, '')),
  );
  const eager = new Set<string>();
  for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
    const text = textByFile.get(file);
    if (eager.has(file) || text === undefined) continue;
    eager.add(file);
    for (const specifier of firstGroups(
      text,
      /\b(?:from|import)\s*["']([^"']+\.js)["']/g,
    )) {
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
