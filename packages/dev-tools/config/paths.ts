import path from 'node:path';
import { createRequire } from 'node:module';

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
