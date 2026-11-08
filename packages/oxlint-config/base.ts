import { defineConfig } from 'oxlint';

/** Shared oxlint config for TypeScript packages without React. */
export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc', 'vitest'],
});
