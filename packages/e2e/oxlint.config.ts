/**
 * Lint settings for the E2E tests: the shared base config, plus one rule for files in `tests/`.
 *
 * That rule fails a test that imports `test` from `@playwright/test`. Tests must import it from
 * `fixtures/app-target.ts`, which answers Sentry's requests, so no test run sends anything to Sentry.
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
                  "Import test from '../fixtures/app-target': it answers Sentry's requests, so the test can't send to Sentry.",
              },
            ],
          },
        ],
      },
    },
  ],
});
