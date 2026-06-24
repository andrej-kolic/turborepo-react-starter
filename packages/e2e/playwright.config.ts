import { defineConfig, devices } from '@playwright/test';
import {
  resolveAppUrl,
  warnIfStaleLocalTargetUrlOverride,
} from '@repo/dev-tools/config/app-port';

function resolveBaseUrl(): string {
  warnIfStaleLocalTargetUrlOverride(process.env, 'preview');
  const url = resolveAppUrl(process.env, 'preview');
  if (!url) {
    throw new Error(
      'Set BUNDLER (e.g. app-vite) or TARGET_URL before running E2E tests against preview.',
    );
  }

  return url;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: resolveBaseUrl(),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
