import { config as baseConfig } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config} */
export default [
  ...baseConfig,

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
