import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { log } from '../config/log.js';
import { ARTIFACTS_ROOT, PACKAGE_ROOT } from '../config/paths.js';

export function uploadArtifacts() {
  if (!fs.existsSync(ARTIFACTS_ROOT)) {
    throw new Error('No artifacts found.');
  }

  const tar = path.join(PACKAGE_ROOT, `artifacts-${Date.now()}.tar.gz`);
  execSync(`tar -czf "${tar}" -C "${ARTIFACTS_ROOT}" .`);
  log(`Packaged artifacts to ${tar}`);
}
