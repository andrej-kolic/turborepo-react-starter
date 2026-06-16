/**
 * Run a sibling `.ts` bin module via tsx.
 * pnpm bin shims must be plain Node entrypoints — not `#!/usr/bin/env tsx`.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const tsxRoot = dirname(require.resolve('tsx/package.json'));
const tsxCli = join(tsxRoot, 'dist/cli.mjs');

/**
 * @param {string} tsFileName  e.g. `print-app-port.ts` in this directory
 * @param {string[]} [argv]    forwarded args (defaults to process.argv.slice(2))
 */
export function runTsBin(tsFileName, argv = process.argv.slice(2)) {
  const entry = join(dirname(fileURLToPath(import.meta.url)), tsFileName);
  const result = spawnSync(process.execPath, [tsxCli, entry, ...argv], {
    stdio: 'inherit',
    env: process.env,
    cwd: process.cwd(),
  });
  process.exit(result.status ?? 1);
}
