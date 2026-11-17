import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { resolvePreviewAppTarget } from './lib/resolve-preview-target';

const target = resolvePreviewAppTarget();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: target.url,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // One project per build profile (docs/template/build-profiles.md); the `e2e` script picks BUILD_PROFILE's.
  projects: [
    {
      name: 'bare',
      grepInvert: /@features/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'features',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Builds the BUNDLER app with BUILD_PROFILE and serves it: Turbo's `preview` depends on `build`.
  // Never an already running preview, which may be another profile's build. TARGET_URL means a preview is up.
  webServer: process.env.TARGET_URL
    ? undefined
    : {
        command: 'pnpm preview:app',
        cwd: resolve(import.meta.dirname, '../..'),
        url: target.url,
        reuseExistingServer: false,
        timeout: 300_000,
        // Turbo runs the preview in its own process group; Playwright's default SIGKILL would leave it running.
        gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
        stdout: 'pipe',
      },
});
