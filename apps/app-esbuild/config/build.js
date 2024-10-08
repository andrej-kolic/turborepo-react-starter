import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/app.tsx"],
  bundle: true,
  metafile: true,
  //   minify: true,
  //   sourcemap: true,
  //   outfile: 'out.js',
  outdir: "dist",
  loader: {
    ".webp": "file",
    ".svg": "file",
  },
  format: 'esm',

  // external: ['react', 'react-dom'],
});
