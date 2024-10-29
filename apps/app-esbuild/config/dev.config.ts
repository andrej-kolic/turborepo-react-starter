import * as esbuild from "esbuild";
import { getEnvVariables } from "@repo/dev-tools/config/environment";
import { appCoreEnvDir } from "@repo/dev-tools/config/paths";

const DEV_DIR = "dev";

const environmentVariables = getEnvVariables(
  appCoreEnvDir,
  process.env.BUILD_ENVIRONMENT ?? 'production',
  "esbuild",
);

async function dev() {
  let ctx = await esbuild.context({
    entryPoints: ["src/app.tsx"],
    bundle: true,
    outdir: DEV_DIR,
    metafile: true,
    sourcemap: true,
    loader: {
      ".webp": "file",
      ".svg": "file",
    },
    format: "esm",
    logLevel: "info",

    define: {
      "import.meta.env": JSON.stringify(environmentVariables),
    },
  });

  await ctx.watch();

  let { host, port } = await ctx.serve({
    servedir: DEV_DIR,
  });
}

dev();
