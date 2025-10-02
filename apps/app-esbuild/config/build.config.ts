import { loadEnvironmentVariables } from '@repo/dev-tools/config/environment';
import { appCoreEnvDir } from '@repo/dev-tools/config/paths';
import * as esbuild from 'esbuild';
import util from 'util';

const debuglog = util.debuglog('app-esbuild');

if (!process.env.BUILD_ENVIRONMENT) {
  const errorMsg =
    'BUILD_ENVIRONMENT environment variable is not set. ' +
    'If you are running locally, edit .env file and run task from project root. ' +
    'IF on CI/CD, set the variable in your pipeline.';
  throw new Error(errorMsg);
}

const BUILD_DIR = 'dist';

const environmentVariables = loadEnvironmentVariables({
  envDir: appCoreEnvDir,
  buildEnvironment: process.env.BUILD_ENVIRONMENT,
  customEnvVars: {
    BUNDLER: 'app-esbuild',
    MODE: 'N/A', // esbuild does not have modes like vite/webpack,
  },
});

debuglog('Runtime environment Variables:', environmentVariables);

async function bundle() {
  try {
    const buildResult = await esbuild.build({
      entryPoints: ['src/app.tsx'],
      bundle: true,
      outdir: BUILD_DIR,
      metafile: true,
      //   minify: true,
      //   sourcemap: true,
      loader: {
        '.webp': 'file',
        '.svg': 'file',
      },
      format: 'esm',

      define: {
        'import.meta.env': JSON.stringify(environmentVariables),
      },

      // external: ['react', 'react-dom'],
    });

    debuglog('Build successful:', buildResult);
  } catch (err) {
    debuglog('Error during build:', err);
  }
}

void bundle();
