import * as esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { loadEnvironmentVariables } from '@repo/dev-tools/config/environment';
import { createPaths } from '@repo/dev-tools/config/paths';
import util from 'util';
import path from 'path';

const debuglog = util.debuglog('app-esbuild');

if (!process.env.BUILD_ENVIRONMENT) {
  const errorMsg =
    'BUILD_ENVIRONMENT environment variable is not set. ' +
    'If you are running locally, edit .env file and run task from project root. ' +
    'IF on CI/CD, set the variable in your pipeline.';
  throw new Error(errorMsg);
}

const DEV_DIR = 'dev';
const { appCorePublic, appCoreEnvDir } = createPaths(import.meta.url);
const publicDir = path.join(appCorePublic, '**', '*');

const environmentVariables = loadEnvironmentVariables({
  envDir: appCoreEnvDir,
  buildEnvironment: process.env.BUILD_ENVIRONMENT,
  customEnvVars: {
    BUNDLER: 'app-esbuild',
    MODE: 'N/A', // esbuild does not have modes like vite/webpack,
  },
});

debuglog('Runtime environment Variables:', environmentVariables);

async function dev() {
  const ctx = await esbuild.context({
    entryPoints: ['src/index.tsx'],
    bundle: true,
    outdir: DEV_DIR,
    metafile: true,
    sourcemap: true,
    loader: {
      '.webp': 'file',
      '.svg': 'file',
    },
    format: 'esm',
    logLevel: 'info',
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: {
          from: [publicDir],
          to: [DEV_DIR],
        },
        watch: true, // Enable watching for dev mode
      }),
    ],
    define: {
      'import.meta.env': JSON.stringify(environmentVariables),
    },
  });

  await ctx.watch();

  const { hosts, port } = await ctx.serve({
    servedir: DEV_DIR,
  });

  debuglog(`Dev server running at: http://${hosts[0]}:${String(port)}`);
}

void dev();
