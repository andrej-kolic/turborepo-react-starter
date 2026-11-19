import { globSync } from 'node:fs';
import type { SizeLimitConfig } from 'size-limit';

const SENTRY_FILES = 'dist/assets/sentry-*.js';

/**
 * Size limits for a bundler app's production build, shared by all bundler apps.
 * Paths are relative to the app folder; every app writes its build to `dist/`.
 * Sizes are Brotli-compressed, as served to users.
 */
const sizeLimitConfig = [
  {
    name: 'JavaScript',
    path: ['dist/assets/*.js', `!${SENTRY_FILES}`],
    limit: '73 kB',
  },
  {
    name: 'CSS',
    path: 'dist/assets/*.css',
    limit: '2 kB',
  },
  {
    name: 'Everything downloaded',
    path: [
      'dist/**/*',
      '!dist/**/*.map',
      '!dist/readme.txt',
      `!${SENTRY_FILES}`,
    ],
    limit: '204 kB',
  },
  // Only builds with APP_REACT_SENTRY_DSN have the file; size-limit fails a check that finds none.
  // A features build always has a DSN (docs/template/build-profiles.md), so there a missing file fails the check.
  ...(process.env.BUILD_PROFILE === 'features' ||
  globSync(SENTRY_FILES).length > 0
    ? [{ name: 'Sentry', path: SENTRY_FILES, limit: '57 kB' }]
    : []),
] satisfies SizeLimitConfig;

export default sizeLimitConfig;
