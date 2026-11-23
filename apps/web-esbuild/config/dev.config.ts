import * as esbuild from 'esbuild';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { copy } from 'esbuild-plugin-copy';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import { createRequire } from 'module';
import {
  defineEnvironmentVariables,
  loadEnvironmentVariables,
} from '@repo/dev-tools/config/environment';
import { createPaths } from '@repo/dev-tools/config/paths';
import util from 'util';
import path from 'path';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as {
  devPort: number;
  previewPort: number;
};

const debuglog = util.debuglog('web-esbuild');

if (!process.env.BUILD_ENVIRONMENT) {
  const errorMsg =
    'BUILD_ENVIRONMENT environment variable is not set. ' +
    'If you are running locally, edit .env file and run task from project root. ' +
    'IF on CI/CD, set the variable in your pipeline.';
  throw new Error(errorMsg);
}

const DEV_DIR = 'dev';
const { webPublic, webEnvDir } = createPaths(import.meta.url);
const publicDir = path.join(webPublic, '**', '*');

// The build environment, as in Vite (--mode); esbuild has no modes of its own.
const MODE = process.env.BUILD_ENVIRONMENT;

const environmentVariables = loadEnvironmentVariables({
  envDir: webEnvDir,
  buildEnvironment: process.env.BUILD_ENVIRONMENT,
  customEnvVars: {
    BUNDLER: 'web-esbuild',
    MODE,
    PROD: false,
  },
});

debuglog('Runtime environment Variables:', environmentVariables);

async function dev() {
  const ctx = await esbuild.context({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outdir: DEV_DIR,
    publicPath: '/',
    metafile: true,
    sourcemap: true,
    loader: {
      '.png': 'file',
      '.webp': 'file',
      '.svg': 'file',
    },
    // As in build.config.ts: without it, lazy-loaded code (each page, the mocked API) loads with the app.
    splitting: true,
    format: 'esm',
    target: browserslistToEsbuild(),
    logLevel: 'info',
    plugins: [
      htmlPlugin({
        files: [
          {
            entryPoints: ['src/index.tsx'],
            filename: 'index.html',
            htmlTemplate: 'src/index.html',
            scriptLoading: 'module',
            define: { title: process.env.APP_REACT_TITLE ?? '', mode: MODE },
          },
        ],
      }),
      copy({
        resolveFrom: 'cwd',
        assets: {
          from: [publicDir],
          to: [DEV_DIR],
        },
        watch: true, // Enable watching for dev mode
      }),
    ],
    define: defineEnvironmentVariables(environmentVariables),
  });

  await ctx.watch();

  const { hosts, port } = await ctx.serve({
    servedir: DEV_DIR,
    // Serve index.html for paths with no file, so deep links like /about load the app.
    fallback: path.join(DEV_DIR, 'index.html'),
    port: pkg.devPort,
  });

  debuglog(`Dev server running at: http://${hosts[0]}:${String(port)}`);
}

void dev();
