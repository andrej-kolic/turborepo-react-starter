import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Only the real suite: record-interactions writes generated tests into artifacts/.
    include: ['__tests__/**/*.test.js'],
    globals: true,
  },
});
