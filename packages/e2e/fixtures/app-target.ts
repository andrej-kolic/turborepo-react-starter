import { test as base } from '@playwright/test';
import type { AppTargets } from '@repo/dev-tools/config/app-port';
import { resolvePreviewAppTarget } from '../lib/resolve-preview-target';

type AppTargetFixtures = {
  appTarget: AppTargets;
};

export const test = base.extend<AppTargetFixtures>({
  // Playwright requires object destructuring for fixture dependencies.
  // eslint-disable-next-line no-empty-pattern -- no upstream fixtures
  appTarget: async ({}, use) => {
    await use(resolvePreviewAppTarget());
  },
});

export { expect } from '@playwright/test';
export { resolvePreviewAppTarget } from '../lib/resolve-preview-target';
