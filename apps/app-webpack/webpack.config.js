const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require("path");

const pathResolve = pathEntry => path.resolve(__dirname, pathEntry);

module.exports = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "output.js",
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // alias: {
    //   'ui': pathResolve('../../packages/ui'),
    // },
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "ReactTs starter",
      template: `./src/index.html`,
    }),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        // exclude: /node_modules/,
      },
      {
        test: /\.ts?$/,
        use: "ts-loader",
        // exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        // use: ['style-loader', 'css-loader'],
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },      
    ],
  },
};
