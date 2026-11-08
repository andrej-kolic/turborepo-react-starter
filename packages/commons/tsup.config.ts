import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: 'tsconfig.lib.json',
  format: ['esm'],
  target: 'es2022',

  /**
   * No clean: deleting dist/ breaks dev servers that resolve @repo/commons from it (#109),
   * and tsc --watch does not re-emit unchanged type definitions. To clean, stop dev and run
   * `pnpm --filter @repo/commons clear:output`.
   */
  // clean: true,

  sourcemap: true,
  // treeshake: true,

  /**
   * Do not use tsup for generating d.ts files because it can not generate type
   * the definition maps required for go-to-definition to work in our IDE. We
   * use tsc for that.
   */
  // dts: false, // false is default
});
