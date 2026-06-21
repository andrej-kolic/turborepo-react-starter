import { isMcpServer } from './runtime.js';

export function log(...args) {
  if (isMcpServer()) process.stderr.write(args.join(' ') + '\n');
  else console.log(...args);
}
