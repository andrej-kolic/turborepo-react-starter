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
    const result = status({ port: PORT });
    if (!result.running && !result.stale) {
      console.log(`❌ Chrome is not running on port ${PORT}`);
    } else if (result.running) {
      console.log(`✅ Chrome is running (PID: ${result.pid}) on port ${PORT}`);
      console.log(`📡 DevTools: http://localhost:${PORT}`);
      console.log(`🔗 WebSocket: ws://localhost:${PORT}/devtools/browser/...`);
    } else {
      console.log(`❌ Stale PID file (process ${result.pid} not found)`);
      console.log(`   Run: pnpm chrome:debug:stop`);
    }
  } else {
    const result = await start({ port: PORT });
    if (result.alreadyRunning) {
      console.log(
        `✅ Chrome already running on port ${PORT} (PID: ${result.pid})`,
      );
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
      console.log(`  - Use pnpm chrome:debug:status to check status`);
      console.log(`  - Connect with Chrome DevTools MCP or Puppeteer`);
      console.log(`  - Run pnpm chrome:debug:stop to cleanly stop`);
    }
  }
} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
