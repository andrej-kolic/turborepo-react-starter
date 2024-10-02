import { defineConfig } from "vite";
import path from "path";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths"; // set up aliases from tsconfig
import { viteStaticCopy } from 'vite-plugin-static-copy';


// TODO: move to common? it's also used by webpack
const __dirname = process.cwd();
const pathResolve = (pathEntry) => path.resolve(__dirname, pathEntry);
const appCorePublic = pathResolve("./node_modules/@repo/app-core/public");
// const assetsCore = pathResolve("./node_modules/@repo/app-core/public");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@repo/app-core/lib/assets/*', // Path to the external library's assets
          dest: 'assets', // Destination folder in the output
        },
        {
          src: 'node_modules/@repo/app-core/lib/app-core.css', // Path to the external library's assets
          dest: '', // Destination folder in the output
        },
      ],
    }),
  ],
  // resolve: {
  // preserveSymlinks: true,
  // alias: {
  //   '~app-core': path.resolve(__dirname, '../../packages/app-core/src'),
  //   '~ui': path.resolve(__dirname, '../../packages/ui/src'),
  // },
  // },

  // base: '/',
  // root: "/Users/andrejkolic/dev/playground/turborepo/turborepo-react-starter/apps/app-vite/",
  // assetsInclude: ["vite.svg"],
  // assetsInclude: ['node_modules/@repo/app-core/lib/assets/**.*'],

  // resolve: {
  //   alias: {
  //     "app-core$": path.resolve(
  //       __dirname,
  //       "node_modules/@repo/app-core2"
  //     ),
  //   },
  // },

  // optimizeDeps: {
  //   // include: ['@repo/app-core'],
  //   include: ["node_modules"],
  // },

  // build: {
  //   assetsInlineLimit: 0, // Prevents images from being inlined and bundles them separately
  // },

  // build: {
  //   rollupOptions: {
  //     external: ["react", "react-dom", "react/jsx-runtime"],
  //     output: {
  //       globals: {
  //         react: "React",
  //         "react-dom": "React-dom",
  //         "react/jsx-runtime": "react/jsx-runtime",
  //       },
  //       assetFileNames: (asset) => {
  //         console.log("***", asset.name);
  //         return asset.name;
  //       },
  //     },
  //   },
  // },

  publicDir: appCorePublic,
});
