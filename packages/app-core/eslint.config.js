import { disableTypeCheck } from '@repo/eslint-config/base';
import { config as reactInternalConfig } from '@repo/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config} */
export default [
  ...reactInternalConfig,

  // vitest.config.ts is not in tsconfig.json; disable typed linting for it.
  disableTypeCheck(['vitest.config.ts']),
];
