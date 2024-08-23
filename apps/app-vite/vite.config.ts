import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'; // set up aliases from tsconfig

// TODO: move to common? it's also used by webpack
const __dirname = process.cwd();
const pathResolve = (pathEntry) => path.resolve(__dirname, pathEntry);
const appCorePublic = pathResolve("./node_modules/app-core/public");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  // resolve: {
    // preserveSymlinks: true,
    // alias: {
    //   '~app-core': path.resolve(__dirname, '../../packages/app-core/src'),
    //   '~ui': path.resolve(__dirname, '../../packages/ui/src'),
    // },
  // },

  publicDir: appCorePublic
})
