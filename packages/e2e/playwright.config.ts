import { defineConfig, devices } from '@playwright/test';
import { resolveAppUrl } from '@repo/dev-tools/config/app-port';

function resolveBaseUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  const url = resolveAppUrl(process.env, 'preview');
  if (!url) {
    throw new Error(
      'Set BUNDLER (e.g. app-vite) or APP_URL before running E2E tests against preview.',
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
  reporter: 'list',
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
