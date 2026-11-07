import fs from 'node:fs';
import path from 'node:path';

export function writeJson(dir, filename, value) {
  fs.writeFileSync(
    path.join(dir, filename),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}
