import * as esbuild from 'esbuild';
import { getEnvVariables } from '@repo/dev-tools/config/environment';
import '@repo/dev-tools/config/paths';
import { appCoreEnvDir } from '@repo/dev-tools/config/paths';

const BUILD_DIR = 'dist';

const environmentVariables = getEnvVariables(
  appCoreEnvDir,
  process.env.BUILD_ENVIRONMENT ?? 'production',
  'esbuild',
);

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

    console.log('Build successfull');
    // console.log(buildResult);
  } catch (err) {
    console.log('Error during build:', err);
  }
}

bundle();
