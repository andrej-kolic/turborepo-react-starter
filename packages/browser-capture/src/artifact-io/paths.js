import fs from 'node:fs';
import path from 'node:path';
import { ARTIFACTS_ROOT } from '../config/paths.js';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toArtifactTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export function ensureArtifactsDirectory(mode) {
  const dir = path.join(ARTIFACTS_ROOT, `${mode}-${toArtifactTimestamp()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
