/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@repo/eslint-config/library.js'],

  // additional rules to test husky / linter integration
  rules: {
    'no-useless-concat': 'error',
    'no-else-return': 'error',
  },

  // env: {
  //   node: true,
  //   es6: true,
  // },
  // parser: "@typescript-eslint/parser",
  // parserOptions: {
  //   project: "./tsconfig.json",
  //   tsconfigRootDir: __dirname,
  // },
  // ignorePatterns: [
  //   "jest.config.js",
  //   // ".*.js", // Ignore dotfiles
  //   // "node_modules/",
  //   // "dist/",
  //   // "build/",
  // ],
};
