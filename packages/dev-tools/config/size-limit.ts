import type { SizeLimitConfig } from 'size-limit';

/**
 * Size limits for a bundler app's production build, shared by all bundler apps.
 * Paths are relative to the app folder; every app writes its build to `dist/`.
 * Sizes are Brotli-compressed, as served to users.
 */
const sizeLimitConfig = [
  {
    name: 'JavaScript',
    path: 'dist/assets/*.js',
    limit: '70 kB',
  },
  {
    name: 'CSS',
    path: 'dist/assets/*.css',
    limit: '2 kB',
  },
  {
    name: 'Everything downloaded',
    path: ['dist/**/*', '!dist/**/*.map', '!dist/readme.txt'],
    limit: '205 kB',
  },
] satisfies SizeLimitConfig;

export default sizeLimitConfig;
