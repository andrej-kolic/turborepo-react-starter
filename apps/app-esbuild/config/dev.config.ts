import * as esbuild from "esbuild";
import { getEnvVariables } from "@repo/dev-tools/config/environment";
import path from "path";

const DEV_DIR = "dev";

console.log("");
console.log("* process.env.NODE_ENV:", process.env.NODE_ENV);
console.log("* process.env.BUILD_ENVIRONMENT", process.env.BUILD_ENVIRONMENT);
console.log("");

const __dirname = process.cwd();
const pathResolve = (pathEntry: string) => path.resolve(__dirname, pathEntry);
// const appCorePublic = pathResolve("./node_modules/@repo/app-core/public");
// const appCoreEnv = pathResolve("./node_modules/@repo/app-core/.env");
const appCoreEnvDir = pathResolve("./node_modules/@repo/app-core/");

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
