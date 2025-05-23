import { config as webpackConfig } from '@repo/eslint-config/webpack';

/** @type {import("eslint").Linter.Config} */
export default [
  ...webpackConfig,

  {
    rules: {
      'no-useless-concat': 'error',
      'no-else-return': 'error',
    },

    ignores: ['node_modules/', 'dist/', 'build/', 'turbo/'],
  },
];
