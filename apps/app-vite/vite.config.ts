import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths'; // set up aliases from tsconfig

// TODO: fix import when fix is available
// must be local path, or vite complains (for now). See https://github.com/vitejs/vite/issues/5370
import {
  appCorePublic,
  appCoreEnvDir,
} from './node_modules/@repo/dev-tools/config/paths';

// NOTE on environments: Vite's mode should be set to the same as BUILD_ENVIRONMENT

if (!process.env.BUILD_ENVIRONMENT) {
  const errorMsg =
    'BUILD_ENVIRONMENT environment variable is not set. ' +
    'If you are running locally, edit .env file and run task from project root. ' +
    'IF on CI/CD, set the variable in your pipeline.';
  throw new Error(errorMsg);
}

// TODO: add printEnv() to dev-tools?
// console.log('- process.env.HELLO: ', process.env.HELLO);
// console.log('- process.env.NODE_ENV: ', process.env.NODE_ENV);
// console.log('- process.env.BUILD_ENVIRONMENT: ', process.env.BUILD_ENVIRONMENT);

export default defineConfig((configEnv) => {
  console.log('* configEnv:', configEnv);

  return {
    // do not getEnvVariables from '@repo/dev-tools/config/environment', but Vite's native mechanism
    // behavior is same as in getEnvVariables()
    envDir: appCoreEnvDir,
    envPrefix: 'APP_REACT',

    base: '', // generate relative paths

    define: {
      'import.meta.env.BUNDLER': JSON.stringify('vite'),
    },

    plugins: [react(), tsconfigPaths()],

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
