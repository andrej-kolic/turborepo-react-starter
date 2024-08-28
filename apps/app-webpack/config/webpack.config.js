import path from "node:path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

const __dirname = process.cwd();
const pathResolve = (pathEntry) => path.resolve(__dirname, pathEntry);

const appCorePublic = pathResolve("./node_modules/app-core/public");
const distPath = pathResolve("./dist");
// const sourceDir = pathResolve("./src");
// const appCoreSourceDir = pathResolve("../../packages/app-core/src");
// const appUiSourceDir = pathResolve("../../packages/ui/src");

export default {
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
    plugins: [new TsconfigPathsPlugin({})]
  },
  plugins: [
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
      {
        test: /\.css$/i,
        // use: ['style-loader', 'css-loader'],
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: { url: true },
          },
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
