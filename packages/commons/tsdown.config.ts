import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.lib.json',
  format: ['esm'],
  // Ship modern syntax: each app lowers it to the root browserslist target.
  target: 'esnext',
  // Keep the .js/.d.ts names that package.json's main and types point to.
  fixedExtension: false,

  /**
   * No clean: deleting dist/ breaks dev servers that resolve @repo/commons from it (#109).
   * To clean, stop dev and run `pnpm --filter @repo/commons clear:output`.
   */
  clean: false,

  sourcemap: true,
  dts: {
    // Declaration maps let go-to-definition open src/ instead of dist/.
    sourcemap: true,
    // Fail build and report in dev on type errors, as tsc did before.
    typecheck: true,
  },
});
