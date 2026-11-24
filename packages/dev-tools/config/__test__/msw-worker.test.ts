import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webDir = join(dirname(fileURLToPath(import.meta.url)), '../../../web');

describe('packages/web/public/mockServiceWorker.js', () => {
  it('matches the installed msw version, or run pnpm --filter @repo/web msw:init', () => {
    const worker = readFileSync(
      join(webDir, 'public/mockServiceWorker.js'),
      'utf8',
    );
    const workerVersion = /const PACKAGE_VERSION = '([^']+)'/.exec(worker)?.[1];
    // Resolved from packages/web, which installs msw.
    const { version } = createRequire(join(webDir, 'package.json'))(
      'msw/package.json',
    ) as { version: string };

    expect(workerVersion).toBe(version);
  });
});
