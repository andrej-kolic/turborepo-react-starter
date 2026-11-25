import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { readBuildProfile } from '@repo/dev-tools/config/environment';
import { API_URL, IN_APP_MOCK } from './lib/api-url';
import { resolvePreviewAppTarget } from './lib/resolve-preview-target';

const target = resolvePreviewAppTarget();

// The default is set here, not in the `e2e` script, because `playwright test` run directly skips that script:
// it would run both profiles' tests on a single build, one made with the developer's `.env.local`.
const profile = readBuildProfile() ?? 'bare';

// A build with the mock inside the app gets only the tests of that mock, every other build all the rest.
const only = IN_APP_MOCK ? /@in-app-mock/ : /.*/;
const never = IN_APP_MOCK ? [] : [/@in-app-mock/];

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
  // One project per build profile (docs/template/build-profiles.md); only the chosen profile's is defined.
  projects: [
    {
      name: 'bare',
      grep: only,
      grepInvert: [...never, /@features/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'features',
      grep: only,
      grepInvert: never,
      use: { ...devices['Desktop Chrome'] },
    },
  ].filter(({ name }) => name === profile),
  // Builds the BUNDLER app with that profile and API address, and serves it: Turbo's `preview` depends on `build`.
  // Never an already running preview, which may be another profile's build. TARGET_URL means a preview is up.
  webServer: process.env.TARGET_URL
    ? undefined
    : {
        command: 'pnpm preview:app',
        cwd: resolve(import.meta.dirname, '../..'),
        env: { BUILD_PROFILE: profile, APP_REACT_API_URL: API_URL },
        url: target.url,
        reuseExistingServer: false,
        timeout: 300_000,
        // Turbo runs the preview in its own process group; Playwright's default SIGKILL would leave it running.
        gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
        stdout: 'pipe',
      },
});
