import fs from 'node:fs';

/**
 * Read a JSON artifact file. The caller names the shape; nothing is validated,
 * so every field of `T` should be optional unless this package wrote the file.
 *
 * @template T
 * @param {string} filePath
 * @returns {T}
 */
export function readJson(filePath) {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- shape is the caller's contract (see JSDoc)
  return /** @type {T} */ (JSON.parse(fs.readFileSync(filePath, 'utf8')));
}
