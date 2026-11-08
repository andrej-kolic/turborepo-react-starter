import path from 'node:path';
import { createRequire } from 'module';
import util from 'util';
import { rspack, type Configuration } from '@rspack/core';
import { loadEnvironmentVariables } from '@repo/dev-tools/config/environment';
import { createPaths } from '@repo/dev-tools/config/paths';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as {
  devPort: number;
};

const { appCorePublic, appCoreEnvDir } = createPaths(import.meta.url);
const distPath = path.resolve('dist');

const debuglog = util.debuglog('app-rspack');

type RspackConfigOptions = {
  mode: 'development' | 'production';
  config: string;
  env: Record<string, string>;
};

const rspackConfig = (
  env: Record<string, string>,
  options: RspackConfigOptions,
): Configuration => {
  debuglog('RspackConfigOptions:', options);

  if (!process.env.BUILD_ENVIRONMENT) {
    const errorMsg =
      'BUILD_ENVIRONMENT environment variable is not set. ' +
      'If you are running locally, edit .env file and run task from project root. ' +
      'IF on CI/CD, set the variable in your pipeline.';
    throw new Error(errorMsg);
  }

  const environmentVariables = loadEnvironmentVariables({
    envDir: appCoreEnvDir,
    buildEnvironment: process.env.BUILD_ENVIRONMENT,
    customEnvVars: {
      BUNDLER: 'app-rspack',
      MODE: options.mode, // should be set to 'development' or 'production'
    },
  });

  debuglog('Runtime environment Variables:', environmentVariables);

  // Hashes only in production: in dev they slow rebuilds and nothing caches the files.
  const hash = options.mode === 'production' ? '-[contenthash:8]' : '';

  return {
    entry: './src/index.tsx',

    // Content-hashed names under assets/ let hosts cache them for a year (see infra deploy).
    output: {
      path: distPath,
      filename: `assets/[name]${hash}.js`,
      chunkFilename: `assets/[name]${hash}.js`,
      cssFilename: `assets/[name]${hash}.css`,
      cssChunkFilename: `assets/[name]${hash}.css`,
      assetModuleFilename: `assets/[name]${hash}[ext]`,
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },

    plugins: [
      new rspack.DefinePlugin({
        'import.meta.env': Object.fromEntries(
          Object.entries(environmentVariables).map(([key, value]) => [
            key,
            JSON.stringify(value),
          ]),
        ),
      }),

      new rspack.HtmlRspackPlugin({
        template: `./src/index.html`,
        templateParameters: {
          title: process.env.APP_REACT_TITLE ?? '',
        },
      }),

      new rspack.CopyRspackPlugin({
        patterns: [
          {
            from: appCorePublic,
            to: distPath,
          },
        ],
      }),
    ],

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules\/(?!@repo)/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              target: 'es2022',
              parser: { syntax: 'typescript', tsx: true },
              transform: {
                react: {
                  runtime: 'automatic',
                  development: options.mode === 'development',
                },
              },
            },
          },
          type: 'javascript/auto',
        },
        {
          test: /\.css$/i,
          type: 'css',
        },
        {
          test: /\.(?:ico|gif|png|jpg|jpeg|jp2|svg|webp)$/i,
          type: 'asset/resource',
        },
      ],
    },

    devServer: {
      port: pkg.devPort,
      historyApiFallback: true, // proxy requests through a specified index page (enable reload without 404)
      hot: true,
      open: false,
      client: {
        overlay: false,
      },
    },
  };
};

export default rspackConfig;
