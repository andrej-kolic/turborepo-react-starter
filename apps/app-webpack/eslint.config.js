import { config as libraryConfig } from '@repo/eslint-config/webpack';

/** @type {import("eslint").Linter.Config} */
export default [
  ...libraryConfig,

  {
    rules: {
      'no-useless-concat': 'error',
      'no-else-return': 'error',
    },

    ignores: ['node_modules/', 'dist/', 'build/', 'turbo/'],
  },
];
