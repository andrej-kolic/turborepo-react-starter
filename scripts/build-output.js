/**
 * Reads a bundler app's build output for the checks that run on it after the build:
 * verify-env-guards.js and verify-page-split.js.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

// JavaScript only, as { file, text }: a source map holds the original source, so searching it
// would find text the build dropped.
export function readBuildScripts(distDir) {
  return readdirSync(distDir, { recursive: true })
    .filter((file) => /\.[cm]?js$/.test(file))
    .map((file) => ({
      file,
      text: readFileSync(join(distDir, file), 'utf8'),
    }));
}

// The scripts the page runs before the app starts, as paths relative to dist/: the ones index.html
// loads and, following static imports, every file they import. import() calls are not followed.
export function readEagerFiles(distDir, files) {
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
