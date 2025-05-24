import {
  config as baseConfig,
  disableTypeCheck,
} from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config} */
export default [
  ...baseConfig,

  disableTypeCheck(['.storybook/*']),

  {
    ignores: ['storybook-static/'],
  },
];
