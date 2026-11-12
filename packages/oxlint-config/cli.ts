import { defineConfig } from 'oxlint';
import base from './base.ts';

/**
 * Shared oxlint config for Node CLI packages in plain JS: the base config,
 * with console output allowed and runtime env vars outside Turbo's task hash.
 */
export default defineConfig({
  ...base,
  rules: {
    ...base.rules,
    'no-console': 'off',
    'turbo/no-undeclared-env-vars': 'off',
  },
  overrides: [
    ...(base.overrides ?? []),
    {
      files: ['**/*.{test,spec}.js'],
      plugins: ['vitest'],
      rules: {
        // Partial test doubles stand in for large library types.
        'typescript/no-unsafe-type-assertion': 'off',
      },
    },
  ],
});
