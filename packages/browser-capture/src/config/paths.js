import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(SRC_DIR, '../..');
export const ARTIFACTS_ROOT = path.join(PACKAGE_ROOT, 'artifacts');
