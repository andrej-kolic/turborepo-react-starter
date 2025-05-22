import { config as libraryConfig } from '@repo/eslint-config/library';

/** @type {import("eslint").Linter.Config} */
export default [
  ...libraryConfig,

  {
    rules: {
      'no-useless-concat': 'error',
      'no-else-return': 'error',
    },
  },
];
