/**
 * Lint settings for the E2E tests: the shared base config, plus one rule for files in `tests/`.
 *
 * That rule fails a test that imports `test` from `@playwright/test`. Tests must import it from
 * `fixtures/app-target.ts`, which answers the requests to Sentry and to the todo API, so no test run sends anything to either.
 */

import { defineConfig } from 'oxlint';
import base from '@repo/oxlint-config/base';

export default defineConfig({
  ...base,
  overrides: [
    ...(base.overrides ?? []),
    {
      files: ['tests/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: '@playwright/test',
                importNames: ['test'],
                message:
                  "Import test from '../fixtures/app-target': it answers requests to Sentry and the todo API, so the test sends to neither.",
              },
            ],
          },
        ],
      },
    },
  ],
});
