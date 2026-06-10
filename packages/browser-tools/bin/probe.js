#!/usr/bin/env node
/**
 * Probe browser environment capabilities.
 *
 * Checks what is actually running/available right now:
 *   - Chrome: up? headless or visible?
 *   - App server: up?
 *   - Display: available? (determines how to start Chrome if it's down)
 *
 * Outputs a mode recommendation: --attach (visible Chrome) or no --attach (headless).
 *
 * Usage:
 *   pnpm browser:probe          # human-readable output
 *   pnpm browser:probe --json   # machine-readable JSON
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const useJson = process.argv.includes('--json');

// --- Chrome ---

const chromePort = Number(process.env.CHROME_DEBUG_PORT || 9222);

async function probeChrome() {
  try {
    const res = await fetch(`http://localhost:${chromePort}/json/version`);
    if (!res.ok) return { up: false };
    const { Browser } = await res.json();
    return {
      up: true,
      headless: Browser?.toLowerCase().includes('headless') ?? false,
    };
  } catch {
    return { up: false };
  }
}

// --- App server ---

function getDevPort() {
  const bundler = process.env.BUNDLER || 'app-vite';
  try {
    const pkg = JSON.parse(
      readFileSync(
        resolve(WORKSPACE_ROOT, 'apps', bundler, 'package.json'),
        'utf8',
      ),
    );
    return typeof pkg.devPort === 'number' ? pkg.devPort : 5173;
  } catch {
    return 5173;
  }
}

async function probeApp(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.status < 500;
  } catch {
    return false;
  }
}

// --- Display ---

function hasDisplay() {
  // Explicit override always wins.
  if (
    process.env.CHROME_HEADLESS === 'true' ||
    process.env.CHROME_HEADLESS === '1'
  )
    return false;
  // macOS: window server runs independently of SSH — display is always available
  // on a running Mac regardless of how you connected.
  if (process.platform === 'darwin') return true;
  // Linux/other: requires $DISPLAY (set by X11/Wayland session or forwarding).
  return Boolean(process.env.DISPLAY);
}

// --- Run ---

const devPort = getDevPort();
const [chrome, appUp, display] = await Promise.all([
  probeChrome(),
  probeApp(devPort),
  Promise.resolve(hasDisplay()),
]);

// If Chrome is running, its own headless flag is the truth.
// If Chrome is down, use display detection to decide how to start it.
const headless = chrome.up ? chrome.headless : !display;
const mode = headless ? 'no-attach' : 'attach';

if (useJson) {
  console.log(
    JSON.stringify(
      {
        chrome: {
          up: chrome.up,
          headless: chrome.up ? chrome.headless : null,
          port: chromePort,
        },
        app: { up: appUp, port: devPort },
        display,
        mode,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const chromeLine = chrome.up
  ? `UP    ${chrome.headless ? 'headless' : 'visible '}   port=${chromePort}`
  : `DOWN  port=${chromePort}`;

console.log(`Chrome:  ${chromeLine}`);
console.log(
  `App:     ${appUp ? `UP    port=${devPort}` : `DOWN  port=${devPort}`}`,
);
console.log(`Display: ${display ? 'YES' : 'NO'}`);
console.log(
  `→ Mode:  ${mode === 'attach' ? '--attach' : 'no --attach (headless)'}`,
);

if (!chrome.up) {
  const startCmd = display
    ? 'pnpm chrome:debug'
    : 'CHROME_HEADLESS=true pnpm chrome:debug';
  console.log(`\nChrome is down — start it: ${startCmd}`);
}
