// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

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
  ...storybook.configs['flat/recommended'],
];
