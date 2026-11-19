import { existsSync } from 'node:fs';
import path from 'node:path';
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping';
import { REPO_ROOT } from '../config/paths.js';

/**
 * Turn a source-map source into a path relative to `root`: the longest
 * trailing part of it that names a file under `root`. Bundlers write sources
 * differently (Vite `http://host/@fs/<absolute path>`, rspack
 * `webpack://<app>/<path>`, esbuild `../<path>`), and the disk settles all of them.
 *
 * @param {string} source
 * @param {string} root
 * @returns {string} the relative path, or `source` when no file matches
 */
function toLocalPath(source, root) {
  const pathPart = source
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
    .replace(/[?#].*$/, '');
  let decoded = pathPart;
  try {
    decoded = decodeURIComponent(pathPart);
  } catch {
    // A stray `%` is not an escape; match the path as written.
  }
  const parts = decoded
    .split('/')
    .filter((part) => part !== '' && part !== '.' && part !== '..');
  for (let i = 0; i < parts.length; i++) {
    const candidate = parts.slice(i).join('/');
    if (existsSync(path.join(root, candidate))) return candidate;
  }
  return source;
}

/**
 * Resolve a bundled script location to original source via source maps.
 *
 * @param {string} scriptUrl
 * @param {number} line
 * @param {number} col
 * @param {string} [root] directory the returned `source` is relative to;
 *   defaults to the repo root
 * @returns {Promise<{ source: string, line: number, column: number } | null>}
 */
export async function resolveSourceLocation(
  scriptUrl,
  line,
  col,
  root = REPO_ROOT,
) {
  try {
    if (!scriptUrl.startsWith('http://') && !scriptUrl.startsWith('https://')) {
      return null;
    }

    const scriptRes = await fetch(scriptUrl);
    if (!scriptRes.ok) return null;
    const scriptText = await scriptRes.text();

    const scriptLines = scriptText.split('\n');
    let sourceMapRef = null;
    for (
      let i = scriptLines.length - 1;
      i >= Math.max(0, scriptLines.length - 10);
      i--
    ) {
      const t = (scriptLines[i] ?? '').trim();
      const m =
        t.match(/\/\/[#@]\s*sourceMappingURL=(.+)/) ||
        t.match(/\/\*[#@]\s*sourceMappingURL=(.+?)\s*\*\//);
      if (m?.[1]) {
        sourceMapRef = m[1].trim();
        break;
      }
    }
    if (!sourceMapRef) return null;

    let rawMap;
    let mapUrl = scriptRes.url;
    if (sourceMapRef.startsWith('data:')) {
      const comma = sourceMapRef.indexOf(',');
      if (comma === -1) return null;
      const payload = sourceMapRef.slice(comma + 1);
      const header = sourceMapRef.slice(5, comma).toLowerCase();
      rawMap = header.includes('base64')
        ? Buffer.from(payload, 'base64').toString('utf8')
        : decodeURIComponent(payload);
    } else {
      mapUrl = new URL(sourceMapRef, scriptRes.url).href;
      const mapRes = await fetch(mapUrl);
      if (!mapRes.ok) return null;
      rawMap = await mapRes.text();
    }

    const tracer = new TraceMap(rawMap, mapUrl);
    const pos = originalPositionFor(tracer, { line, column: col });
    if (!pos.source || pos.line == null) return null;

    return {
      source: toLocalPath(pos.source, root),
      line: pos.line,
      column: pos.column ?? 0,
    };
  } catch {
    return null;
  }
}
