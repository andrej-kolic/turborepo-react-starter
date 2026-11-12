import fs from 'node:fs';
import path from 'node:path';
import { ARTIFACTS_ROOT } from '../config/paths.js';

/**
 * Resolve after a delay.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format a date for use in an artifact directory name.
 *
 * @param {Date} [date]
 * @returns {string}
 */
export function toArtifactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * Create a timestamped artifacts subdirectory for a capture mode.
 *
 * @param {string} mode  e.g. "trace", "console", "snapshot"
 * @returns {string} absolute path to the new directory
 */
export function ensureArtifactsDirectory(mode) {
  const dir = path.join(ARTIFACTS_ROOT, `${mode}-${toArtifactTimestamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
