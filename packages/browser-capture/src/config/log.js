import { isMcpServer } from './runtime.js';

/**
 * Log to stdout in CLI mode and stderr in MCP mode so stdio transport is not corrupted.
 *
 * @param {...unknown} args
 */
export function log(...args) {
  if (isMcpServer()) process.stderr.write(args.join(' ') + '\n');
  else console.log(...args);
}
