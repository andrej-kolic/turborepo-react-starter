import path from "node:path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import Dotenv from "dotenv-webpack";
import type * as webpack from "webpack";
import "webpack-dev-server";

const __dirname = process.cwd();
const pathResolve = (pathEntry: string) => path.resolve(__dirname, pathEntry);

const appCorePublic = pathResolve("./node_modules/@repo/app-core/public");
const distPath = pathResolve("./dist");
// const sourceDir = pathResolve("./src");
// const appCoreSourceDir = pathResolve("../../packages/app-core/src");
// const appUiSourceDir = pathResolve("../../packages/ui/src");
const appCoreEnvDir = pathResolve("./node_modules/@repo/app-core/");

// const webpackMode = 'production';
const nodeEnv = process.env.NODE_ENV ?? "";
const envSuffix = `.${nodeEnv}`; // TODO: replace with explicit MODE ?
const localSuffix = ""; // TODO: figre out handling (does .local file exists?)
const envFile = `.env${envSuffix}${localSuffix}`;

// const envFile = '.env';

// console.log('* process.env:', process.env);
console.log("* NODE_ENV:", process.env.NODE_ENV);
console.log("* envFile:", envFile);

interface WebpackConfigOptions {
  mode: "development" | "production";
  entry: string;
}

const webpackConfig = (
  options: WebpackConfigOptions
): webpack.Configuration => {
  // const { mode, entry } = options;  // console.log('* arg:', ...args);
  console.log("* options:", options);

  return {
    // mode: 'production',
    // mode: webpackMode,
    entry: "./src/index.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "output.js",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      // alias: {
      //   "~": [sourceDir, appCoreSourceDir, appUiSourceDir],
      // },
      plugins: [new TsconfigPathsPlugin({})],
    },
    plugins: [

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- no proper type defs for dotenv-webpack
      new Dotenv({
        // path: [
        // // `${appCoreEnvDir}/${envFile}`,
        // `${appCoreEnvDir}/.env`,
        // ],

        // @ts-ignore
        // path: [`${appCoreEnvDir}/.env`],

        path: `${appCoreEnvDir}/.env`,

        // safe: true, // load '.env.example' to verify the '.env' variables are all set. Can also be a string to a different file.
        // allowEmptyValues: true, // allow empty variables (e.g. `FOO=`) (treat it as empty string, rather than missing)
        // systemvars: true, // load all the predefined 'process.env' variables which will trump anything local per dotenv specs.
        // silent: true, // hide any errors
        // defaults: false, // load '.env.defaults' as the default values if empty.

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment -- prefix is added in latest version, but type definitions are lagging
        // @ts-ignore
        prefix: "import.meta.env.", // reference your env variables as 'import.meta.env.ENV_VAR'
      }),

      new HtmlWebpackPlugin({
        title: "ReactTs starter",
        template: `./src/index.html`,
      }),

      new MiniCssExtractPlugin({
        filename: "static/css/[name].css",
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
          use: "ts-loader",
          exclude: /node_modules/,
        },
        // {
        //   test: /\.(?:t|j)sx?$/,
        //   exclude: /node_modules/,
        //   use: [
        //     // ...
        //     {
        //       loader: 'import-meta-loader',
        //       options: {
        //         // isVite2: true,
        //         // alias: {}
        //       }
        //     }
        //   ]
        // },
        {
          test: /\.css$/i,
          // use: ['style-loader', 'css-loader'],
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: "css-loader",
              options: { url: true },
            },
            // {
            //   loader: 'import-meta-loader',
            //   options: {
            //     // isVite2: true,
            //     // alias: {}
            //   }
            // }
          ],
        },
        {
          test: /\.(?:ico|gif|png|jpg|jpeg|jp2|svg|webp)$/i,
          type: "asset/resource",
          generator: {
            filename: "static/assets/images/[name][hash][ext]",
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
