import { isTruthyFlag } from '@repo/browser-tools/cli/args';
import { getDefaultDurationMs } from '../config/env.js';

export { parseArgs } from '@repo/browser-tools/cli/args';

export function requireUrl(command, url) {
  if (!url) {
    throw new Error(`${command} requires a URL.`);
  }

  return url;
}

export function resolveDurationMs(options) {
  if (options['duration-ms']) {
    const durationMs = Number(options['duration-ms']);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error('duration-ms must be a positive number.');
    }

    return durationMs;
  }

  if (options.duration) {
    const durationSeconds = Number(options.duration);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error('duration must be a positive number of seconds.');
    }

    return Math.round(durationSeconds * 1000);
  }

  return getDefaultDurationMs();
}

export function captureOptions(options) {
  return {
    durationMs: resolveDurationMs(options),
    attach: isTruthyFlag(options.attach),
    sanitize: options['no-sanitize'] !== true,
  };
}
