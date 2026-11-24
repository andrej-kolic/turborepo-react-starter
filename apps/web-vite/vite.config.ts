import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import util from 'util';
import { createRequire } from 'module';

const debuglog = util.debuglog('web-vite');
const _require = createRequire(import.meta.url);
const pkg = _require('./package.json') as {
  devPort: number;
  previewPort: number;
};

import {
  defineEnvironmentVariables,
  loadEnvironmentVariables,
} from '@repo/dev-tools/config/environment';
import { createPaths } from '@repo/dev-tools/config/paths';

const { webPublic, webEnvDir } = createPaths(import.meta.url);

// NOTE on environments: Vite's mode should be set to the same as BUILD_ENVIRONMENT

if (!process.env.BUILD_ENVIRONMENT) {
  const errorMsg =
    'BUILD_ENVIRONMENT environment variable is not set. ' +
    'If you are running locally, edit .env file and run task from project root. ' +
    'IF on CI/CD, set the variable in your pipeline.';
  throw new Error(errorMsg);
}

const buildEnvironment = process.env.BUILD_ENVIRONMENT;

export default defineConfig((configEnv) => {
  // Vite's configEnv.mode should be set to the same as BUILD_ENVIRONMENT
  debuglog('configEnv:', configEnv);

  // MODE is the same value Vite puts in import.meta.env.MODE itself.
  const environmentVariables = loadEnvironmentVariables({
    envDir: webEnvDir,
    buildEnvironment,
    // `vite preview` also runs as 'serve'; it serves a build, so it loads a build's files.
    devServer: configEnv.command === 'serve' && !configEnv.isPreview,
    customEnvVars: {
      BUNDLER: 'web-vite',
      MODE: configEnv.mode,
      // Vite's own PROD: it sets NODE_ENV (build: production, dev: development) before loading this file.
      PROD: process.env.NODE_ENV === 'production',
    },
  });

  debuglog('Runtime environment Variables:', environmentVariables);

  return {
    // Absolute asset URLs, so a deep link like /about/x still loads /assets/...; the app must be served from the domain root.
    base: '/',

    // .env files are read by loadEnvironmentVariables, the same as in the other bundlers.
    // It puts them into process.env, where Vite still finds them for %APP_REACT_*% in index.html.
    // Like the other bundlers, dev does not restart on .env changes; restart it by hand.
    envDir: false,
    envPrefix: 'APP_REACT',
    define: defineEnvironmentVariables(environmentVariables),

    server: {
      // Every address, as rspack and esbuild do; see docs/template/decisions/0014.
      host: true,
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
    // JIT packages (@repo/ui, @repo/web, @repo/core): raw .ts/.tsx source.
    // Compiled package (@repo/commons): dist/ updates from tsdown watch.
    optimizeDeps: {
      exclude: ['@repo/ui', '@repo/web', '@repo/core', '@repo/commons'],
    },

    publicDir: webPublic,

    build: {
      target: browserslistToEsbuild(),
      // .map files without a sourceMappingURL comment: the deploy uploads them to Sentry and deletes them.
      sourcemap: 'hidden',
      // TODO: remove, added for readable output
      // minify: false,
      // rollupOptions: {
      //   // external: ["react", "react-dom", "react/jsx-runtime"],
      //   treeshake: false,
      // },
    },
  };
});
