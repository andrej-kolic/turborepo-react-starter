#!/usr/bin/env node
/**
 * Browser setup — ensure Chrome is running and a tab is open at the URL.
 *
 * Idempotent: safe to call when Chrome is already running or tab is already open.
 * Detects display availability and starts Chrome in the correct mode.
 *
 * Output:
 *   "Ready. Use --attach."    → add --attach to all browser subcommands
 *   "Ready. No --attach."     → omit --attach (headless mode)
 *
 * URL resolution: --url flag → APP_URL env var → error.
 *
 * Usage:
 *   browser-tools-setup                          # required_permissions: all
 *   browser-tools-setup --url http://localhost:5173
 */

import { start } from '../src/chrome/lifecycle.js';
import { openUrl } from '../src/cdp/tabs.js';
import { parseArgs, resolveUrl } from '../src/cli/args.js';

function hasDisplay() {
  if (
    process.env.CHROME_HEADLESS === 'true' ||
    process.env.CHROME_HEADLESS === '1'
  )
    return false;
  if (process.platform === 'darwin') return true;
  return Boolean(process.env.DISPLAY);
}

const { options } = parseArgs(process.argv.slice(2));
const url = resolveUrl(options.url);
const port = Number(process.env.CHROME_DEBUG_PORT || 9222);
const display = hasDisplay();

try {
  const chrome = await start({ port, headless: !display });
  console.log(
    chrome.alreadyRunning
      ? `Chrome: already running on port ${port}`
      : `Chrome: started (PID: ${chrome.pid})`,
  );

  if (display) {
    const tab = await openUrl(url);
    console.log(`Tab: ${tab.url}${tab.navigated ? '' : ' (already open)'}`);
    console.log('Ready. Use --attach.');
  } else {
    console.log('Ready. No --attach.');
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
