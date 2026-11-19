import fs from 'node:fs';
import path from 'node:path';

/**
 * Write a value as pretty-printed JSON into an artifacts directory.
 *
 * @param {string} dir
 * @param {string} filename
 * @param {unknown} value
 * @returns {void}
 */
export function writeJson(dir, filename, value) {
  fs.writeFileSync(
    path.join(dir, filename),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}
