#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppEndpoints } from '@repo/dev-tools/config/app-port';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { previewPort } = loadAppEndpoints('web-rspack');

// -s: serve index.html for paths with no file, so deep links like /about load the app.
const result = spawnSync('serve', ['-s', './dist', '-p', String(previewPort)], {
  stdio: 'inherit',
  cwd: appRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
