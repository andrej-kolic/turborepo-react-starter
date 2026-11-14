import { loadEnvironmentVariables } from '@repo/dev-tools/config/environment';
import { createPaths } from '@repo/dev-tools/config/paths';
import * as esbuild from 'esbuild';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import util from 'util';
import { copy } from 'esbuild-plugin-copy';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import fs from 'fs';
import path from 'path';

const debuglog = util.debuglog('app-esbuild');

if (!process.env.BUILD_ENVIRONMENT) {
  const errorMsg =
    'BUILD_ENVIRONMENT environment variable is not set. ' +
    'If you are running locally, edit .env file and run task from project root. ' +
    'IF on CI/CD, set the variable in your pipeline.';
  throw new Error(errorMsg);
}

const BUILD_DIR = 'dist';
const { appCorePublic, appCoreEnvDir } = createPaths(import.meta.url);
const publicDir = path.join(appCorePublic, '**', '*');

const environmentVariables = loadEnvironmentVariables({
  envDir: appCoreEnvDir,
  buildEnvironment: process.env.BUILD_ENVIRONMENT,
  customEnvVars: {
    BUNDLER: 'app-esbuild',
    MODE: 'N/A', // esbuild does not have modes like vite/rspack,
  },
});

debuglog('Runtime environment Variables:', environmentVariables);

// Leftovers from earlier builds would otherwise be deployed with the new ones.
fs.rmSync(BUILD_DIR, { recursive: true, force: true });

const buildResult = await esbuild.build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  outdir: BUILD_DIR,
  // Content-hashed names under assets/ let hosts cache them for a year (see infra deploy).
  entryNames: 'assets/[name]-[hash]',
  assetNames: 'assets/[name]-[hash]',
  // Without it, JS refers to images relative to assets/, which breaks from index.html at the root.
  publicPath: '/',
  metafile: true,
  minify: true,
  //   sourcemap: true,
  loader: {
    '.png': 'file',
    '.webp': 'file',
    '.svg': 'file',
  },
  format: 'esm',
  target: browserslistToEsbuild(),

  define: {
    'import.meta.env': JSON.stringify(environmentVariables),
  },

  plugins: [
    htmlPlugin({
      files: [
        {
          entryPoints: ['src/index.tsx'],
          filename: 'index.html',
          htmlTemplate: 'src/index.html',
          scriptLoading: 'module',
        },
      ],
    }),
    copy({
      resolveFrom: 'cwd',
      assets: {
        from: [publicDir],
        to: [BUILD_DIR],
      },
      watch: false,
    }),
  ],

  // external: ['react', 'react-dom'],
});

debuglog('Build successful:', buildResult);
