import { defineConfig } from 'oxlint';

/** Shared oxlint config for TypeScript packages without React. */
export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc', 'import'],
  jsPlugins: ['eslint-plugin-turbo'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  ignorePatterns: ['turbo/'],
  rules: {
    // Type-safety rules oxlint files under "pedantic".
    'typescript/no-unsafe-argument': 'error',
    'typescript/no-unsafe-assignment': 'error',
    'typescript/no-unsafe-call': 'error',
    'typescript/no-unsafe-member-access': 'error',
    'typescript/no-unsafe-return': 'error',
    'typescript/no-misused-promises': 'error',
    'typescript/switch-exhaustiveness-check': 'error',
    'typescript/no-deprecated': 'error',
    'typescript/only-throw-error': 'error',
    'typescript/restrict-template-expressions': [
      'error',
      { allowNumber: true },
    ],
    'typescript/consistent-type-definitions': ['warn', 'type'],
    'no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': 'warn',
    'import/no-cycle': 'error',
    'import/no-unassigned-import': 'off',
    'turbo/no-undeclared-env-vars': 'warn',
  },
  overrides: [
    {
      files: ['**/*.{test,spec}.{ts,tsx}'],
      plugins: ['vitest'],
    },
  ],
});
