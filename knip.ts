import type { KnipConfig } from 'knip';

export default {
  workspaces: {
    '.': {
      // Run by the `browser:ensure-app` script through dev-tools-app-target, which knip can't follow.
      entry: ['scripts/ensure-app.js'],
      // Its bin runs through dev-tools-app-target in the `capture` script.
      ignoreDependencies: ['@repo/browser-capture'],
    },
    'apps/app-rspack': {
      rspack: { config: ['config/rspack.config.ts'] },
    },
    'infra/netlify': {
      // Run as `pnpm netlify` from tools/deploy-netlify.sh; knip doesn't read shell scripts.
      ignoreDependencies: ['netlify-cli'],
    },
    'packages/dev-tools': {
      // bin/app-target.js loads it by file name through run-ts.js.
      entry: ['bin/*.ts'],
    },
    'packages/oxlint-config': {
      // Loaded by name through `jsPlugins` in base.ts.
      ignoreDependencies: ['eslint-plugin-turbo'],
    },
  },
} satisfies KnipConfig;
