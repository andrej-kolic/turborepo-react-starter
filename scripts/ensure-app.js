#!/usr/bin/env node
/**
 * Ensure the dev app is running.
 *
 * Reads APP_URL from env (injected by with-app-url.js via pnpm browser:ensure-app).
 * If the app is DOWN, starts `pnpm dev:app` and polls until it responds (60 s).
 * Exits 0 when live, exits 1 on timeout or immediate server crash.
 *
 * Run via pnpm browser:ensure-app — do not invoke directly.
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const url = process.env.APP_URL;
if (!url) {
  console.error(
    'Error: APP_URL is not set.\n' +
      '  Run via: pnpm browser:ensure-app\n' +
      '  Or set APP_URL explicitly before invoking.',
  );
  process.exit(1);
}

async function isUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitUntilUp(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUp(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

if (await isUp(url)) {
  console.log(`App: UP  ${url}`);
  process.exit(0);
}

console.log(`App: DOWN  ${url}`);
console.log('Starting dev server ...');

const server = spawn('pnpm', ['dev:app'], {
  detached: true,
  stdio: ['ignore', 'ignore', 'pipe'],
  cwd: WORKSPACE_ROOT,
});

let serverExited = false;
let serverExitCode = null;
let serverStderr = '';

server.stderr.on('data', (chunk) => {
  serverStderr += chunk.toString();
});
server.on('exit', (code) => {
  serverExited = true;
  serverExitCode = code;
});

// Short grace period to catch immediate crashes (port conflict, missing .env, etc.)
await new Promise((r) => setTimeout(r, 2000));

if (serverExited) {
  console.error(
    `Dev server exited immediately (exit code ${serverExitCode}).` +
      (serverStderr.trim() ? `\n${serverStderr.trim()}` : ''),
  );
  process.exit(1);
}

// Server still running — close the pipe (so the event loop is not kept alive) and detach.
server.stderr.destroy();
server.unref();

const ready = await waitUntilUp(url, 60_000);
if (!ready) {
  console.error(`App did not respond at ${url} within 60 s.`);
  process.exit(1);
}

console.log(`App: UP  ${url}`);
