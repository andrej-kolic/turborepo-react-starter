#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAppEndpoints } from '@repo/dev-tools/config/app-port.js';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { previewPort } = loadAppEndpoints('app-webpack');

const result = spawnSync('serve', ['./dist', '-p', String(previewPort)], {
  stdio: 'inherit',
  cwd: appRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
