import { config as esbuildConfig } from '@repo/eslint-config/esbuild';
import { globalIgnores } from 'eslint/config';

/** @type {import("eslint").Linter.Config} */
export default [
  ...esbuildConfig,
  globalIgnores(['dev/']),
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  },
];
