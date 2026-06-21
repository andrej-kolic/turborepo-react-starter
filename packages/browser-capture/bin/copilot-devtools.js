#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from '../src/cli/args.js';
import { usage } from '../src/cli/usage.js';
import { validateCaptureDuration } from '../src/config/env.js';
import { initRuntime, setSanitizeEnabled } from '../src/config/runtime.js';
import { captureSnapshot } from '../src/capture/snapshot.js';
import { recordConsole } from '../src/capture/console.js';
import { recordInteractions } from '../src/capture/interactions.js';
import { recordPerformance } from '../src/capture/performance.js';
import { recordTrace } from '../src/capture/trace.js';
import { uploadArtifacts } from '../src/artifacts/upload.js';
import { startMcpServer } from '../src/mcp/server.js';
import { sanitizeArtifacts } from '../src/sanitize/index.js';

const isMcpServer = process.argv[2] === 'mcp-server';
initRuntime({ isMcpServer });
validateCaptureDuration(isMcpServer);

async function main() {
  const cmd = process.argv[2];

  if (cmd === 'mcp-server') {
    try {
      await startMcpServer();
    } catch (error) {
      process.stderr.write(
        `Failed to start MCP server: ${error instanceof Error ? error.message : error}\n`,
      );
      process.exit(1);
    }
    return;
  }

  const { positionals, options } = parseArgs(process.argv.slice(3));
  const url = positionals[0] || process.env.CAPTURE_URL;
  if (options['no-sanitize']) setSanitizeEnabled(false);

  if (!cmd || cmd === 'help' || cmd === '--help') {
    usage();
    process.exit(0);
  }

  try {
    if (cmd === 'sanitize-artifacts') {
      const dir = positionals[0];
      if (!dir)
        throw new Error('sanitize-artifacts requires a directory argument.');
      sanitizeArtifacts(path.resolve(dir));
      return;
    }

    if (cmd === 'capture-snapshot') {
      await captureSnapshot();
      return;
    }

    if (cmd === 'record-trace') {
      await recordTrace(url, options);
      return;
    }

    if (cmd === 'record-performance') {
      await recordPerformance(url, options);
      return;
    }

    if (cmd === 'record-console') {
      await recordConsole(options);
      return;
    }

    if (cmd === 'record-interactions') {
      await recordInteractions(url, options);
      return;
    }

    if (cmd === 'upload-artifacts') {
      uploadArtifacts();
      return;
    }

    throw new Error(`Unknown command: ${cmd}`);
  } catch (error) {
    console.error(
      'Failed to execute command:',
      error instanceof Error ? error.message : error,
    );
    usage();
    process.exit(1);
  }
}

await main();
