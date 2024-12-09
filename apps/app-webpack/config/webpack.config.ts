import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import webpack from 'webpack';
import { getEnvVariables } from '@repo/dev-tools/config/environment';
import {
  appCorePublic,
  appCoreEnvDir,
  distPath,
} from '@repo/dev-tools/config/paths';

import 'webpack-dev-server';

// const webpackMode = 'production';
// const nodeEnv = process.env.NODE_ENV ?? "";

const envMap = getEnvVariables(
  appCoreEnvDir,
  process.env.BUILD_ENVIRONMENT ?? 'production',
  'webpack',
);

//

interface WebpackConfigOptions {
  mode: 'development' | 'production';
  config: string;
  env: Record<string, string>;
}

const webpackConfig = (
  env: Record<string, string>,
  options: WebpackConfigOptions,
): webpack.Configuration => {
  console.log('');
  console.log('* options:', options);
  console.log('* env:', env);
  console.log('');

  return {
    // mode: 'production',
    // mode: webpackMode,

    entry: './src/index.tsx',

    output: {
      path: distPath,
      filename: 'output.js',
      clean: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      plugins: [new TsconfigPathsPlugin({})],
    },

    plugins: [
      new webpack.DefinePlugin({
        'import.meta.env': JSON.stringify(envMap),
      }),

      new HtmlWebpackPlugin({
        // title: "ReactTs starter",
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
          exclude: /node_modules/,
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
