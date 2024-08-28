import * as esbuild from "esbuild";

const DEV_DIR = "dev";

let ctx = await esbuild.context({
  entryPoints: ["./src/app.tsx"],
  bundle: true,
  outdir: DEV_DIR,
  metafile: true,
  //   minify: true,
  //   sourcemap: true,
  loader: {
    ".webp": "file",
    ".svg": "file",
  },
  logLevel: "info",
});

await ctx.watch();

let { host, port } = await ctx.serve({
  servedir: DEV_DIR,
});
