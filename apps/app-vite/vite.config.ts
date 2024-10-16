import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths"; // set up aliases from tsconfig

// TODO: move to common? it's also used by webpack
const __dirname = process.cwd();
const pathResolve = (pathEntry) => path.resolve(__dirname, pathEntry);
const appCorePublic = pathResolve("./node_modules/@repo/app-core/public");
// const appCoreEnv = pathResolve("./node_modules/@repo/app-core/.env");
const appCoreEnvDir = pathResolve("./node_modules/@repo/app-core/");

console.log("* process.env.NODE_ENV: ", process.env.NODE_ENV);

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
