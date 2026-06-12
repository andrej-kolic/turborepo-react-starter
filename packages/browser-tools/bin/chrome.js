#!/usr/bin/env node
/**
 * Chrome lifecycle CLI — start, stop, and check Chrome with remote debugging.
 *
 * Usage:
 *   pnpm chrome:debug              # Start Chrome on port 9222
 *   pnpm chrome:debug:status       # Check status
 *   pnpm chrome:debug:stop         # Stop Chrome
 *   CHROME_DEBUG_PORT=9223 pnpm chrome:debug  # Custom port
 */

import { start, stop, status } from '../src/chrome/lifecycle.js';

const PORT = Number(process.env.CHROME_DEBUG_PORT || 9222);

const command = process.argv[2] || 'start';

try {
  if (command === '--stop' || command === 'stop') {
    const result = stop({ port: PORT });
    if (!result.running && !result.stopped) {
      console.log('Chrome is not running.');
    } else if (result.stopped) {
      console.log(`✅ Chrome stopped (PID: ${result.pid})`);
    } else {
      console.log(
        `⚠️  Failed to stop Chrome (PID: ${result.pid}): ${result.error}`,
      );
    }
  } else if (command === '--status' || command === 'status') {
    const result = await status({ port: PORT });
    if (result.running) {
      const pidLabel = result.pid
        ? ` (PID: ${result.pid})`
        : ' (external — no PID file)';
      const staleNote = result.stale
        ? ' — PID file stale; run pnpm chrome:debug:stop to clean up'
        : '';
      console.log(
        `✅ Chrome is running${pidLabel} on port ${PORT}${staleNote}`,
      );
      console.log(`📡 DevTools: http://localhost:${PORT}`);
      console.log(`🔗 WebSocket: ws://localhost:${PORT}/devtools/browser/...`);
    } else {
      const pidNote = result.pid
        ? ` (stale PID file: ${result.pid}; run pnpm chrome:debug:stop)`
        : '';
      console.log(`❌ Chrome is not running on port ${PORT}${pidNote}`);
    }
  } else {
    const result = await start({ port: PORT });
    if (result.alreadyRunning) {
      const pidLabel = result.pid
        ? ` (PID: ${result.pid})`
        : ' (external — no PID file)';
      console.log(`✅ Chrome already running on port ${PORT}${pidLabel}`);
      console.log(`📡 DevTools: http://localhost:${PORT}`);
      console.log(`🔗 WebSocket: ws://localhost:${PORT}/devtools/browser/...`);
    } else {
      if (!result.ready) {
        console.warn(
          `⚠️  Chrome started (PID: ${result.pid}) but DevTools not responding on port ${PORT} yet.`,
        );
      }
      console.log(`✅ Chrome started on port ${PORT} (PID: ${result.pid})`);
      console.log(`📡 DevTools: http://localhost:${PORT}`);
      console.log(`🔗 WebSocket: ws://localhost:${PORT}/devtools/browser/...`);
      console.log(`💾 Session: ${result.userDataDir}`);
      console.log(``);
      console.log(`Next steps:`);
      console.log(`  - pnpm chrome:debug:status`);
      console.log(`  - pnpm chrome:debug:stop`);
    }
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
