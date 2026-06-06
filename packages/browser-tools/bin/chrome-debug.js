#!/usr/bin/env node
/**
 * Chrome Remote Debugging Lifecycle Manager
 * Automatically discovers Chrome, manages PID file, and provides unified CLI for agents
 *
 * Based on patterns used by:
 * - google/chrome-launcher (src/chrome-finder.ts)
 * - microsoft/playwright (configuration patterns)
 * - Skyvern AI (docs/developers/self-hosted/browser.mdx)
 *
 * Usage:
 *   pnpm chrome:debug              # Start Chrome
 *   pnpm chrome:debug:status       # Check status
 *   pnpm chrome:debug:stop         # Stop Chrome
 *   CHROME_DEBUG_PORT=9223 pnpm chrome:debug  # Custom port
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import os from 'os';

const PORT = process.env.CHROME_DEBUG_PORT || 9222;
const DEBUGGING_SESSION_DIR = path.join(
  os.homedir(),
  '.chrome-debugging-sessions',
);
const PID_FILE = path.join(DEBUGGING_SESSION_DIR, `chrome.${PORT}.pid`);

/**
 * Chrome executable paths in priority order
 * Based on google/chrome-launcher and microsoft/playwright patterns
 * macOS support; easily extended to Linux/Windows
 */
function getChromeExecutablePaths() {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS priority (matches chrome-launcher exactly)
    return [
      process.env.CHROME_PATH, // env override first (highest priority)
      process.env.LIGHTHOUSE_CHROMIUM_PATH, // legacy
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // standard
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/opt/homebrew/bin/google-chrome', // Homebrew ARM
      '/usr/local/bin/google-chrome', // Homebrew Intel
    ].filter(Boolean);
  }

  if (platform === 'linux') {
    return [
      process.env.CHROME_PATH,
      '/usr/bin/google-chrome-stable', // Ubuntu/Debian
      '/usr/bin/chromium-browser', // Chromium
      '/snap/bin/google-chrome', // Snap
      '/snap/bin/chromium',
      `${os.homedir()}/.local/bin/chromium`, // Build from source
    ].filter(Boolean);
  }

  if (platform === 'win32') {
    return [
      process.env.CHROME_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ].filter(Boolean);
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Find Chrome executable on this machine
 */
function findChromeExecutable() {
  const paths = getChromeExecutablePaths();

  for (const chromePath of paths) {
    try {
      if (fs.existsSync(chromePath)) {
        console.log(`✅ Found Chrome at: ${chromePath}`);
        return chromePath;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  throw new Error(
    `❌ Chrome not found. Checked paths:\n${paths.join('\n')}\n\n` +
      `   Install Chrome or set CHROME_PATH=/path/to/chrome`,
  );
}

/**
 * Check if a process is still alive
 */
function isProcessAlive(pid) {
  try {
    // kill -0 returns 0 if process exists, non-zero otherwise
    execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for Chrome DevTools endpoint to be ready
 */
async function waitForChrome(port, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/json/version`);
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/**
 * Start Chrome with remote debugging
 */
async function startChrome() {
  const chromePath = findChromeExecutable();

  // Check if already running
  if (fs.existsSync(PID_FILE)) {
    const existingPid = fs.readFileSync(PID_FILE, 'utf8').trim();
    if (isProcessAlive(existingPid)) {
      console.log(
        `✅ Chrome already running on port ${PORT} (PID: ${existingPid})`,
      );
      console.log(`📡 DevTools: http://localhost:${PORT}`);
      console.log(`🔗 WebSocket: ws://localhost:${PORT}/devtools/browser/...`);
      return;
    } else {
      // Stale PID, clean up
      try {
        fs.unlinkSync(PID_FILE);
      } catch (e) {
        // Ignore
      }
    }
  }

  // Ensure session directory exists
  if (!fs.existsSync(DEBUGGING_SESSION_DIR)) {
    fs.mkdirSync(DEBUGGING_SESSION_DIR, { recursive: true });
  }

  const userDataDir = path.join(DEBUGGING_SESSION_DIR, `session-${PORT}`);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Spawn Chrome in background (detached)
  const spawnArgs = [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-blink-features=AutomationControlled',
  ];

  // Support headless mode in CI via CHROME_HEADLESS or HEADLESS env vars
  if (
    process.env.CHROME_HEADLESS === '1' ||
    process.env.CHROME_HEADLESS === 'true' ||
    process.env.HEADLESS === '1' ||
    process.env.HEADLESS === 'true'
  ) {
    spawnArgs.push('--headless=new');
  }

  // Append any extra flags from CHROME_EXTRA_ARGS (space-separated, supports quoted args)
  if (process.env.CHROME_EXTRA_ARGS) {
    const extra =
      process.env.CHROME_EXTRA_ARGS.match(/(?:[^\s\"]+|\"[^\"]*\")+/g) || [];
    extra.forEach((a) => spawnArgs.push(a.replace(/^\"(.*)\"$/, '$1')));
  }

  const chrome = spawn(chromePath, spawnArgs, {
    detached: true,
    stdio: 'ignore',
  });

  chrome.unref();

  // Wait for DevTools endpoint to be ready before exiting
  const ready = await waitForChrome(PORT);
  if (!ready) {
    console.warn(
      `⚠️  Chrome started (PID: ${chrome.pid}) but DevTools not responding on port ${PORT} yet.`,
    );
  }

  // Save PID for later cleanup
  fs.writeFileSync(PID_FILE, String(chrome.pid));

  console.log(`✅ Chrome started on port ${PORT} (PID: ${chrome.pid})`);
  console.log(`📡 DevTools: http://localhost:${PORT}`);
  console.log(`🔗 WebSocket: ws://localhost:${PORT}/devtools/browser/...`);
  console.log(`💾 Session: ${userDataDir}`);
  console.log(``);
  console.log(`Next steps:`);
  console.log(`  - Use pnpm chrome:debug:status to check status`);
  console.log(`  - Connect with Chrome DevTools MCP or Puppeteer`);
  console.log(`  - Run pnpm chrome:debug:stop to cleanly stop`);
}

/**
 * Stop Chrome gracefully
 */
function stopChrome() {
  if (!fs.existsSync(PID_FILE)) {
    console.log('Chrome is not running.');
    return;
  }

  const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
  try {
    execSync(`kill ${pid}`);
    try {
      fs.unlinkSync(PID_FILE);
    } catch (e) {
      // Ignore
    }
    console.log(`✅ Chrome stopped (PID: ${pid})`);
  } catch (e) {
    console.log(`⚠️  Failed to stop Chrome (PID: ${pid}): ${e.message}`);
  }
}

/**
 * Show status of Chrome debugging session
 */
function getStatus() {
  if (!fs.existsSync(PID_FILE)) {
    console.log(`❌ Chrome is not running on port ${PORT}`);
    return;
  }

  const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
  if (isProcessAlive(pid)) {
    console.log(`✅ Chrome is running (PID: ${pid}) on port ${PORT}`);
    console.log(`📡 DevTools: http://localhost:${PORT}`);
    console.log(`🔗 WebSocket: ws://localhost:${PORT}/devtools/browser/...`);
  } else {
    console.log(`❌ Stale PID file (process ${pid} not found)`);
    console.log(`   Run: pnpm chrome:debug:stop`);
  }
}

/**
 * Main entry point
 */
const command = process.argv[2] || 'start';
try {
  if (command === '--stop' || command === 'stop') {
    stopChrome();
  } else if (command === '--status' || command === 'status') {
    getStatus();
  } else {
    await startChrome();
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
