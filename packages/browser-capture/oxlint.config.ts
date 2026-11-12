import { defineConfig } from 'oxlint';
import cli from '@repo/oxlint-config/cli';

export default defineConfig({
  ...cli,
  rules: {
    ...cli.rules,
    // Page globals shared with the inject scripts, and React's fiber fields.
    'no-underscore-dangle': [
      'warn',
      {
        allow: [
          '__BROWSER_CAPTURE_INTERACTIONS__',
          '__BROWSER_CAPTURE_PERF__',
          '__recordInteraction',
          '_debugSource',
          '_debugStack',
        ],
      },
    ],
  },
});
