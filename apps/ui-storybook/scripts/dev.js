#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppEndpoints } from '@repo/dev-tools/config/app-port.js';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { devPort } = loadAppEndpoints('ui-storybook');

const args = ['dev', '-p', String(devPort)];
if (process.env.STORYBOOK_OPTIONS) {
  args.push(...process.env.STORYBOOK_OPTIONS.split(/\s+/).filter(Boolean));
}

const result = spawnSync('storybook', args, {
  stdio: 'inherit',
  cwd: appRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
