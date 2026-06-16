import { config } from '@repo/eslint-config/react-internal';
import { disableTypeCheck } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,

  // vitest.config.ts is not in tsconfig.json; disable typed linting for it.
  disableTypeCheck(['vitest.config.ts']),
];
