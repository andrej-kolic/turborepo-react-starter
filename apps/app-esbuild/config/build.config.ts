import * as esbuild from "esbuild";
import { getEnvVariables } from "./utils";
import path from "path";

import tsNodeLoader from 'ts-node';
// import tsNodeLoader from 'ts-node/esm';

tsNodeLoader.register({
  esm: true
});

const BUILD_DIR = "dist";

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
  process.env.BUILD_ENVIRONMENT ?? 'production'
);

// const buildResult = await
async function bundle() {
  try {
    const buildResult = await esbuild.build({
      // entryPoints: 3,
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

    console.log("Build successfull");
    // console.log(buildResult);
  } catch (err) {
    console.log('Error during build:', err);
  }
}

bundle();
