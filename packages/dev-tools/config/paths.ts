import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const DEV_TOOLS_CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Monorepo root (`packages/dev-tools/config` → three levels up). */
export const workspaceRoot = path.resolve(DEV_TOOLS_CONFIG_DIR, '../../..');

/**
 * Creates resolved paths for @repo/app-core using the caller's module resolution context.
 * Pass `import.meta.url` from the calling config file.
 */
export function createPaths(importMetaUrl: string) {
  const require = createRequire(importMetaUrl);

  // Resolve @repo/app-core from the caller's perspective — correct regardless of pnpm hoisting
  const appCoreMain = require.resolve('@repo/app-core');
  // main is ./src/index.tsx → two dirname calls to reach the package root
  const appCoreRoot = path.dirname(path.dirname(appCoreMain));

  return {
    appCorePublic: path.join(appCoreRoot, 'public'),
    appCoreEnvDir: appCoreRoot,
  };
}
