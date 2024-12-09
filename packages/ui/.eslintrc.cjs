const path = require('path');

console.log('*', path.join(__dirname, './src')); // TODO: remove

module.exports = {
  root: true,
  extends: ['@repo/eslint-config/react-internal.js'],
  // extends: ["@repo/eslint-config/library.js"],
  // parser: "@typescript-eslint/parser",
  // parserOptions: {
  //   project: "./tsconfig.lint.json",
  //   tsconfigRootDir: __dirname,
  // },

  // extends: ["custom/react-internal"],
  // ignorePatterns: ["node_modules/", "dist/", "build/", "turbo/"],
  // rules: {
  //   "import/no-extraneous-dependencies": [
  //     "error",
  //     {
  //       devDependencies: true,
  //       optionalDependencies: false,
  //       peerDependencies: false,
  //     },
  //   ],
  // },
  // env: {
  //   browser: true,
  //   // amd: true,
  //   node: true,
  // },
};
