import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import util from 'util';
import { createRequire } from 'module';

const debuglog = util.debuglog('app-vite');
const _require = createRequire(import.meta.url);
const pkg = _require('./package.json') as {
  devPort: number;
  previewPort: number;
};

import { loadEnvironmentVariables } from '@repo/dev-tools/config/environment';
import { createPaths } from '@repo/dev-tools/config/paths';

const { appCorePublic, appCoreEnvDir } = createPaths(import.meta.url);

// NOTE on environments: Vite's mode should be set to the same as BUILD_ENVIRONMENT

if (!process.env.BUILD_ENVIRONMENT) {
  const errorMsg =
    'BUILD_ENVIRONMENT environment variable is not set. ' +
    'If you are running locally, edit .env file and run task from project root. ' +
    'IF on CI/CD, set the variable in your pipeline.';
  throw new Error(errorMsg);
}

// MODE is left to Vite, which sets it from --mode.
const environmentVariables = loadEnvironmentVariables({
  envDir: appCoreEnvDir,
  buildEnvironment: process.env.BUILD_ENVIRONMENT,
  customEnvVars: { BUNDLER: 'app-vite' },
});

debuglog('Runtime environment Variables:', environmentVariables);

export default defineConfig((configEnv) => {
  // Vite's configEnv.mode should be set to the same as BUILD_ENVIRONMENT
  debuglog('configEnv:', configEnv);

  return {
    base: '', // generate relative paths

    // .env files are read by loadEnvironmentVariables, the same as in the other bundlers.
    // It puts them into process.env, where Vite still finds them for %APP_REACT_*% in index.html.
    // Like the other bundlers, dev does not restart on .env changes; restart it by hand.
    envDir: false,
    envPrefix: 'APP_REACT',
    define: Object.fromEntries(
      Object.entries(environmentVariables).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),

    server: {
      port: pkg.devPort,
      strictPort: true,
      watch: {
        // Re-read @repo/commons when its compiled dist/ changes (pnpm workspace link).
        ignored: ['!**/node_modules/@repo/commons/**'],
      },
    },
    preview: {
      port: pkg.previewPort,
      strictPort: true,
    },

    plugins: [react()],

    // Exclude workspace packages from pre-bundling so Vite's transform pipeline handles them.
    // JIT packages (@repo/ui, @repo/app-core): raw .tsx source.
    // Compiled package (@repo/commons): dist/ updates from tsdown watch.
    optimizeDeps: {
      exclude: ['@repo/ui', '@repo/app-core', '@repo/commons'],
    },

    publicDir: appCorePublic,

    build: {
      target: browserslistToEsbuild(),
      // TODO: remove, added for readable output
      // minify: false,
      // rollupOptions: {
      //   // external: ["react", "react-dom", "react/jsx-runtime"],
      //   treeshake: false,
      // },
    },
  };
});
