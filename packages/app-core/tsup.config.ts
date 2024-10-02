import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
//   bundle: false,
  clean: true,
  sourcemap: true,
  dts: true,
  treeshake: false,
  splitting: false,
  skipNodeModulesBundle: true,


  outDir: "lib/",
  entry: ["./src/app-core.tsx"],
  format: ["esm"],
  external: ["react"],
  // publicDir: "./public",

  esbuildOptions(options, context) {
    // the directory structure will be the same as the source
    // options.outbase = "./src";

    options.assetNames = 'assets/[name]';
  },
  loader: {
    '.svg': 'file',
    '.webp': 'file',
  },

  ...options,
}));
