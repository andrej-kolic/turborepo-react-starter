/**
 * Temp app folders with a fake `dist/` for the build output check tests.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Creates `<temp>/app-test/dist` holding `files` (path relative to dist → content),
 * plus an index.html that loads `entry` with a script tag.
 *
 * @returns the app folder and its temp parent, for cleanup
 */
export function createApp({
  entry = '/assets/index.js',
  files,
}: {
  entry?: string;
  files: Readonly<Record<string, string>>;
}) {
  const tempDir = mkdtempSync(join(tmpdir(), 'dev-tools-build-'));
  const appDir = join(tempDir, 'app-test');
  const distDir = join(appDir, 'dist');
  mkdirSync(distDir, { recursive: true });
  writeFileSync(
    join(distDir, 'index.html'),
    `<!doctype html><script type="module" crossorigin src="${entry}"></script>`,
  );
  for (const [file, text] of Object.entries(files)) {
    mkdirSync(dirname(join(distDir, file)), { recursive: true });
    writeFileSync(join(distDir, file), text);
  }
  return { tempDir, appDir, distDir };
}
