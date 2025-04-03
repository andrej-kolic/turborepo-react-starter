// TODO import vite instead of webpack
import { config as viteConfig } from '@repo/eslint-config/webpack';

/** @type {import("eslint").Linter.Config} */
export default [
  ...viteConfig,

  {
    rules: {
      'no-useless-concat': 'error',
      'no-else-return': 'error',
    },
  },
];
