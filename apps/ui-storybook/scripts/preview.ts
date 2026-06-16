#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppEndpoints } from '@repo/dev-tools/config/app-port';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { previewPort } = loadAppEndpoints('ui-storybook');

const result = spawnSync(
  'serve',
  ['./storybook-static', '-p', String(previewPort)],
  {
    stdio: 'inherit',
    cwd: appRoot,
    env: process.env,
  },
);

process.exit(result.status ?? 1);
