import {
  config as libraryConfig,
  disableTypeCheck,
} from '@repo/eslint-config/library';

/** @type {import("eslint").Linter.Config} */
export default [
  ...libraryConfig,

  // Disable typed linting for test files: the project service uses tsconfig.json
  // (which has no vitest/globals), causing false positives for describe/it/expect.
  // Type correctness for tests is enforced by `check:type` via tsconfig.test.json.
  disableTypeCheck(['tsup.config.ts', 'src/**/__test__/**']),
];
