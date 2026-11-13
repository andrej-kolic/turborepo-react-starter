import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveSourceLocation } from '../src/interactions/source-map.js';

const SOURCE = 'packages/app-core/src/components/Header/index.tsx';

/**
 * A source map whose first generated position maps to line 1 of `source`.
 *
 * @param {string} source
 * @returns {string}
 */
function sourceMap(source) {
  return JSON.stringify({ version: 3, sources: [source], mappings: 'AAAA' });
}

/**
 * Serve `files` (URL → body) to `fetch`.
 *
 * @param {Record<string, string>} files
 */
function serve(files) {
  vi.stubGlobal('fetch', async (/** @type {string} */ url) => ({
    ok: url in files,
    url,
    text: async () => files[url] ?? '',
  }));
}

describe('resolveSourceLocation', () => {
  /** @type {string} */
  let root;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'source-map-'));
    mkdirSync(path.dirname(path.join(root, SOURCE)), { recursive: true });
    writeFileSync(path.join(root, SOURCE), '');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rmSync(root, { recursive: true, force: true });
  });

  it('returns the repo path for a Vite module with an inline map naming only the file', async () => {
    const scriptUrl = `http://localhost:5173/@fs${root}/${SOURCE}`;
    const inline = Buffer.from(sourceMap('index.tsx')).toString('base64');
    serve({
      [scriptUrl]: `x\n//# sourceMappingURL=data:application/json;base64,${inline}`,
    });

    expect(await resolveSourceLocation(scriptUrl, 1, 0, root)).toEqual({
      source: SOURCE,
      line: 1,
      column: 0,
    });
  });

  it('returns the repo path for an rspack bundle with a webpack:// source', async () => {
    serve({
      'http://localhost:8080/assets/main.js':
        'x\n//# sourceMappingURL=main.js.map',
      'http://localhost:8080/assets/main.js.map': sourceMap(
        `webpack://app-rspack/${SOURCE}`,
      ),
    });

    expect(
      await resolveSourceLocation(
        'http://localhost:8080/assets/main.js',
        1,
        0,
        root,
      ),
    ).toEqual({ source: SOURCE, line: 1, column: 0 });
  });

  it('returns the repo path for an esbuild bundle with a ../ source', async () => {
    serve({
      'http://localhost:8000/index.js': 'x\n//# sourceMappingURL=index.js.map',
      'http://localhost:8000/index.js.map': sourceMap(`../../../${SOURCE}`),
    });

    expect(
      await resolveSourceLocation('http://localhost:8000/index.js', 1, 0, root),
    ).toEqual({ source: SOURCE, line: 1, column: 0 });
  });

  it('returns the source resolved against the map URL when no file under root matches', async () => {
    serve({
      'http://localhost:8000/index.js': 'x\n//# sourceMappingURL=index.js.map',
      'http://localhost:8000/index.js.map': sourceMap('../src/Missing.tsx'),
    });

    expect(
      await resolveSourceLocation('http://localhost:8000/index.js', 1, 0, root),
    ).toEqual({
      source: 'http://localhost:8000/src/Missing.tsx',
      line: 1,
      column: 0,
    });
  });

  it('keeps the location when a source has a % that is not an escape', async () => {
    serve({
      'http://localhost:8000/index.js': 'x\n//# sourceMappingURL=index.js.map',
      'http://localhost:8000/index.js.map': sourceMap('../src/100%.tsx'),
    });

    expect(
      await resolveSourceLocation('http://localhost:8000/index.js', 1, 0, root),
    ).toEqual({
      source: 'http://localhost:8000/src/100%.tsx',
      line: 1,
      column: 0,
    });
  });

  it('returns a repo-root path by default, wherever the command runs', async () => {
    serve({
      'http://localhost:8000/index.js': 'x\n//# sourceMappingURL=index.js.map',
      'http://localhost:8000/index.js.map': sourceMap(`../../../${SOURCE}`),
    });

    expect(
      await resolveSourceLocation('http://localhost:8000/index.js', 1, 0),
    ).toEqual({ source: SOURCE, line: 1, column: 0 });
  });
});
