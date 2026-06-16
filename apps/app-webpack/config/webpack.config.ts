import path from 'node:path';
import { createRequire } from 'module';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import { loadEnvironmentVariables } from '@repo/dev-tools/config/environment';
import { createPaths } from '@repo/dev-tools/config/paths';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as {
  devPort: number;
};

const { appCorePublic, appCoreEnvDir } = createPaths(import.meta.url);
const distPath = path.resolve('dist');

import 'webpack-dev-server';
import util from 'util';

const debuglog = util.debuglog('app-webpack');

//

type WebpackConfigOptions = {
  mode: 'development' | 'production';
  config: string;
  env: Record<string, string>;
};

const webpackConfig = (
  env: Record<string, string>,
  options: WebpackConfigOptions,
): webpack.Configuration => {
  debuglog('WebpackConfigOptions:', options);

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
      BUNDLER: 'app-webpack',
      MODE: options.mode, // should be set to 'development' or 'production'
    },
  });

  debuglog('Runtime environment Variables:', environmentVariables);

  return {
    entry: './src/index.tsx',

    output: {
      path: distPath,
      filename: 'output.js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },

    plugins: [
      new webpack.DefinePlugin({
        'import.meta.env': Object.fromEntries(
          Object.entries(environmentVariables).map(([key, value]) => [
            key,
            JSON.stringify(value),
          ]),
        ),
      }),

      new HtmlWebpackPlugin({
        template: `./src/index.html`,
        templateParameters: {
          title: process.env.APP_REACT_TITLE,
        },
      }),

      new MiniCssExtractPlugin({
        filename: 'static/css/[name].css',
      }),

      new CopyWebpackPlugin({
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
          use: 'ts-loader',
          exclude: /node_modules\/(?!@repo)/,
        },
        {
          test: /\.css$/i,
          // use: ['style-loader', 'css-loader'],
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: { url: true },
            },
          ],
        },
        {
          test: /\.(?:ico|gif|png|jpg|jpeg|jp2|svg|webp)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/assets/images/[name][hash][ext]',
          },
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

export default webpackConfig;
