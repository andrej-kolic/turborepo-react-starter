import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths"; // set up aliases from tsconfig

// TODO: fix import when fix is available
// must be local path, or vite complains (for now). See https://github.com/vitejs/vite/issues/5370
import {
  appCorePublic,
  appCoreEnvDir,
}
from "./node_modules/@repo/dev-tools/config/paths";

// TODO: add printEnv() to dev-tools?
console.log("* process.env.NODE_ENV: ", process.env.NODE_ENV);
console.log("* process.env.BUILD_ENVIRONMENT: ", process.env.BUILD_ENVIRONMENT);

// const de = dotenvx.config({
//   path: appCoreEnv
// });

// // const de = dotenvx.config();
// console.log('*** dotenvx:', de);

// const dotEnvMap = new Map<string, unknown>();
// for (const [key, value] of Object.entries(de.parsed)) {
//   console.log(`Key: ${key}, Value: ${value}`);
//   /**
//    * add logic to filter variables, for ex. only if prefixed with REACT_APP prefix.
//    * also add variables from process.env if necessary
//    */
//   dotEnvMap.set(`process.env.${key}`, JSON.stringify(value));
// }

// console.log('* map:', Object.fromEntries(dotEnvMap));

// https://vitejs.dev/config/
// export default defineConfig({
export default defineConfig((configEnv) => {
  console.log("* configEnv:", configEnv);

  // const { command, mode, isSsrBuild, isPreview } = configEnv;

  return {
    envDir: appCoreEnvDir,
    envPrefix: "APP_REACT",

    // define: Object.fromEntries(dotEnvMap),

    // define: {
    //   'process.env.API_URL': JSON.stringify(process.env.API_URL),
    //   'process.env.TEST': JSON.stringify('abc'),
    // },

    define: {
      "import.meta.env.BUNDLER": JSON.stringify("vite"),
    },

    plugins: [react(), tsconfigPaths()],

    // resolve: {
    // preserveSymlinks: true,
    // alias: {
    //   '~app-core': path.resolve(__dirname, '../../packages/app-core/src'),
    //   '~ui': path.resolve(__dirname, '../../packages/ui/src'),
    // },
    // },

    publicDir: appCorePublic,

    // TODO: remove, added for readable output
    // build: {
    //   minify: false,
    //   rollupOptions: {
    //     // external: ["react", "react-dom", "react/jsx-runtime"],
    //     treeshake: false,
    //   },
    // },
  };
});
