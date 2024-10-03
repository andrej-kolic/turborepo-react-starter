import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",

  /**
   * clean: true mess with watch mode because it empty folder, but type definitions are not recreated
   * by tsc if there were no changes. Use custom clean when making a build instead.
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
