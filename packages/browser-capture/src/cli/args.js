import { isTruthyFlag } from '@repo/browser-tools/cli/args';
import { getDefaultDurationMs } from '../config/env.js';

export { parseArgs } from '@repo/browser-tools/cli/args';

/**
 * Resolve capture target URL: positional → APP_URL → CAPTURE_URL.
 *
 * @param {string | undefined} urlArg  first positional URL, if any
 * @returns {string | undefined}
 */
export function resolveCaptureUrl(urlArg) {
  if (urlArg && typeof urlArg === 'string') return urlArg;
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.CAPTURE_URL) return process.env.CAPTURE_URL;
  return undefined;
}

export function requireUrl(command, url) {
  const resolved = resolveCaptureUrl(url);
  if (!resolved) {
    throw new Error(
      `${command} requires a URL: pass as positional, or set APP_URL or CAPTURE_URL.`,
    );
  }

  return resolved;
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
  };
}
