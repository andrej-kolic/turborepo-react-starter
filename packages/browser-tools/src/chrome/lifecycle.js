import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import os from 'os';

const DEBUGGING_SESSION_DIR = path.join(
  os.homedir(),
  '.chrome-debugging-sessions',
);

function getPidFile(port) {
  return path.join(DEBUGGING_SESSION_DIR, `chrome.${port}.pid`);
}

/**
 * Chrome executable paths in priority order.
 * Based on google/chrome-launcher and microsoft/playwright patterns.
 */
function getChromeExecutablePaths() {
  const platform = process.platform;

  if (platform === 'darwin') {
    return [
      process.env.CHROME_PATH,
      process.env.LIGHTHOUSE_CHROMIUM_PATH,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/opt/homebrew/bin/google-chrome',
      '/usr/local/bin/google-chrome',
    ].filter(Boolean);
  }

  if (platform === 'linux') {
    return [
      process.env.CHROME_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/snap/bin/google-chrome',
      '/snap/bin/chromium',
      `${os.homedir()}/.local/bin/chromium`,
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

function findChromeExecutable() {
  const paths = getChromeExecutablePaths();
  for (const chromePath of paths) {
    try {
      if (fs.existsSync(chromePath)) return chromePath;
    } catch {
      // continue to next path
    }
  }
  throw new Error(
    `Chrome not found. Checked paths:\n${paths.join('\n')}\n\nInstall Chrome or set CHROME_PATH=/path/to/chrome`,
  );
}

function isProcessAlive(pid) {
  try {
    execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForChrome(port, timeoutMs = 25_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/**
 * Start Chrome with remote debugging.
 *
 * @param {{ port?: number, headless?: boolean }} options
 * @returns {{ alreadyRunning: boolean, pid: string|number, port: number, ready?: boolean, userDataDir?: string }}
 */
export async function start({
  port = Number(process.env.CHROME_DEBUG_PORT || 9222),
  headless,
} = {}) {
  // Port-first check: if the debug endpoint is already responding, treat as
  // already running regardless of PID file (covers Cursor CLI, manual launches,
  // and sandboxed environments where kill -0 is blocked).
  if (await isPortOpen(port)) {
    const pidFile = getPidFile(port);
    const pid = fs.existsSync(pidFile)
      ? fs.readFileSync(pidFile, 'utf8').trim()
      : undefined;
    return { alreadyRunning: true, pid, port };
  }

  const chromePath = findChromeExecutable();
  const pidFile = getPidFile(port);

  if (fs.existsSync(pidFile)) {
    const existingPid = fs.readFileSync(pidFile, 'utf8').trim();
    if (isProcessAlive(existingPid)) {
      return { alreadyRunning: true, pid: existingPid, port };
    }
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // ignore stale file removal errors
    }
  }

  if (!fs.existsSync(DEBUGGING_SESSION_DIR)) {
    fs.mkdirSync(DEBUGGING_SESSION_DIR, { recursive: true });
  }

  const userDataDir = path.join(DEBUGGING_SESSION_DIR, `session-${port}`);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-blink-features=AutomationControlled',
  ];

  const isHeadless =
    headless === true ||
    process.env.CHROME_HEADLESS === '1' ||
    process.env.CHROME_HEADLESS === 'true' ||
    process.env.HEADLESS === '1' ||
    process.env.HEADLESS === 'true';

  if (isHeadless) args.push('--headless=new');

  if (process.env.CHROME_EXTRA_ARGS) {
    const extra =
      process.env.CHROME_EXTRA_ARGS.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    extra.forEach((a) => args.push(a.replace(/^"(.*)"$/, '$1')));
  }

  const chrome = spawn(chromePath, args, { detached: true, stdio: 'ignore' });
  chrome.unref();

  const ready = await waitForChrome(port);
  fs.writeFileSync(pidFile, String(chrome.pid));

  return { alreadyRunning: false, pid: chrome.pid, port, ready, userDataDir };
}

/**
 * Stop Chrome gracefully.
 *
 * @param {{ port?: number }} options
 * @returns {{ running: boolean, stopped?: boolean, pid?: string, error?: string }}
 */
export function stop({
  port = Number(process.env.CHROME_DEBUG_PORT || 9222),
} = {}) {
  const pidFile = getPidFile(port);
  if (!fs.existsSync(pidFile)) {
    return { running: false };
  }
  const pid = fs.readFileSync(pidFile, 'utf8').trim();
  try {
    execSync(`kill ${pid}`);
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // ignore
    }
    return { stopped: true, pid };
  } catch (e) {
    return { stopped: false, pid, error: e.message };
  }
}

/**
 * Get the status of the Chrome debugging session.
 *
 * Uses the DevTools port as the authoritative liveness check, with kill -0 as
 * supplementary info. This makes status reliable in sandboxed environments
 * (e.g. Cursor agent shell) where kill -0 on foreign PIDs is blocked.
 *
 * @param {{ port?: number }} options
 * @returns {Promise<{ running: boolean, pid?: string, port: number, stale?: boolean, external?: boolean }>}
 */
export async function status({
  port = Number(process.env.CHROME_DEBUG_PORT || 9222),
} = {}) {
  const portOpen = await isPortOpen(port);
  const pidFile = getPidFile(port);

  if (!fs.existsSync(pidFile)) {
    // Port open but no PID file — started externally (Cursor CLI, manual)
    return { running: portOpen, port, external: portOpen };
  }

  const pid = fs.readFileSync(pidFile, 'utf8').trim();
  const pidAlive = isProcessAlive(pid);

  if (portOpen) {
    // Port is the source of truth — Chrome is running
    return { running: true, pid, port, stale: !pidAlive };
  }

  // Port not responding — Chrome is down (PID file may be stale)
  return { running: false, pid, port, stale: true };
}
