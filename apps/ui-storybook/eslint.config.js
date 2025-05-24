import {
  config as libraryConfig,
  disableTypeCheck,
} from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config} */
export default [
  ...libraryConfig,

  disableTypeCheck(['.storybook/*']),

  {
    rules: {
      'no-useless-concat': 'error',
      'no-else-return': 'error',
    },
  },

  {
    ignores: [
      'eslintrc.config.js',
      'node_modules/',
      'dist/',
      'build/',
      'turbo/',
      'storybook-static/',
    ],
  },
];
