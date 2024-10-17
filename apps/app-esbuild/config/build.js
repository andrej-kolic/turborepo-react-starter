import * as esbuild from "esbuild";
import { getEnvVariables } from './utils.js';
import path from "path";

const BUILD_DIR = "dist";

console.log("* process.env.NODE_ENV: ", process.env.NODE_ENV);
console.log("* process.env.BUILD_ENVIRONMENT: ", process.env.BUILD_ENVIRONMENT);

const __dirname = process.cwd();
const pathResolve = (pathEntry) => path.resolve(__dirname, pathEntry);
// const appCorePublic = pathResolve("./node_modules/@repo/app-core/public");
// const appCoreEnv = pathResolve("./node_modules/@repo/app-core/.env");
const appCoreEnvDir = pathResolve("./node_modules/@repo/app-core/");

const environmentVariables = getEnvVariables(appCoreEnvDir, process.env.BUILD_ENVIRONMENT);

await esbuild.build({
  entryPoints: ["src/app.tsx"],
  bundle: true,
  outdir: BUILD_DIR,
  metafile: true,
  //   minify: true,
  //   sourcemap: true,
  loader: {
    ".webp": "file",
    ".svg": "file",
  },
  format: "esm",

  define: {
    "import.meta.env": JSON.stringify(environmentVariables),
  },

  // external: ['react', 'react-dom'],
});
