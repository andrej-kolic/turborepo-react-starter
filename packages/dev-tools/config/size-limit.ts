import { globSync } from 'node:fs';
import type { SizeLimitConfig } from 'size-limit';

const SENTRY_FILES = 'dist/assets/sentry-*.js';
// The mocked API: MSW's code and its service worker, which only todo page visitors download.
const MSW_CODE = 'dist/assets/msw-browser-*.js';
const MSW_FILES = [MSW_CODE, 'dist/mockServiceWorker.js'];

/**
 * Size limits for a bundler app's production build, shared by all bundler apps.
 * Paths are relative to the app folder; every app writes its build to `dist/`.
 * Sizes are Brotli-compressed, as served to users.
 */
const sizeLimitConfig = [
  {
    name: 'JavaScript',
    path: ['dist/assets/*.js', `!${SENTRY_FILES}`, `!${MSW_CODE}`],
    limit: '135 kB',
  },
  {
    name: 'CSS',
    path: 'dist/assets/*.css',
    limit: '3 kB',
  },
  {
    name: 'Everything downloaded',
    path: [
      'dist/**/*',
      '!dist/**/*.map',
      '!dist/readme.txt',
      `!${SENTRY_FILES}`,
      ...MSW_FILES.map((file) => `!${file}`),
    ],
    limit: '268 kB',
  },
  // Only builds without APP_REACT_API_URL have the MSW file. Neither profile sets it, so there a missing file fails the check.
  ...(process.env.BUILD_PROFILE || globSync(MSW_CODE).length > 0
    ? [{ name: 'Mocked API (MSW)', path: MSW_FILES, limit: '100 kB' }]
    : []),
  // Only builds with APP_REACT_SENTRY_DSN have the file; size-limit fails a check that finds none.
  // A features build always has a DSN (docs/template/build-profiles.md), so there a missing file fails the check.
  ...(process.env.BUILD_PROFILE === 'features' ||
  globSync(SENTRY_FILES).length > 0
    ? [{ name: 'Sentry', path: SENTRY_FILES, limit: '57 kB' }]
    : []),
] satisfies SizeLimitConfig;

export default sizeLimitConfig;
