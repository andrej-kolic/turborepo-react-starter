import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import util from 'util';

const debuglog = util.debuglog('app-vite');

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

export default defineConfig((configEnv) => {
  // Vite's configEnv.mode should be set to the same as BUILD_ENVIRONMENT
  debuglog('configEnv:', configEnv);

  return {
    base: '', // generate relative paths

    // do not use loadEnvironmentVariables from '@repo/dev-tools/config/environment', but Vite's native mechanism
    // behavior is same as in getEnvVariables()
    // NOTE: alternatively use loadEnvironmentVariables for consistency across all apps
    envDir: appCoreEnvDir,
    envPrefix: 'APP_REACT',
    define: {
      'import.meta.env.BUNDLER': JSON.stringify('app-vite'),
      'import.meta.env.BUILD_ENVIRONMENT': JSON.stringify(
        process.env.BUILD_ENVIRONMENT,
      ),
    },

    plugins: [react()],

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
