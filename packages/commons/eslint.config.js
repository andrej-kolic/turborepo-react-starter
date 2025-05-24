import {
  config as libraryConfig,
  disableTypeCheck,
} from '@repo/eslint-config/library';

/** @type {import("eslint").Linter.Config} */
export default [
  ...libraryConfig,

  //

  disableTypeCheck(['tsup.config.ts']),
];
