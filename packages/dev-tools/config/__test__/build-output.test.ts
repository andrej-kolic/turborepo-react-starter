import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { readBuildScripts, readEagerFiles } from '../build-output';
import { createApp } from './build-fixture';

let tempDir: string | undefined;

function dist(files: Record<string, string>, entry?: string) {
  const app = createApp({ files, entry });
  tempDir = app.tempDir;
  return app.distDir;
}

function eagerFiles(distDir: string) {
  return [...readEagerFiles(distDir, readBuildScripts(distDir))].sort();
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe('readBuildScripts', () => {
  it('returns every JavaScript file by its path in dist, and no source map or HTML', () => {
    const distDir = dist({
      'assets/index.js': 'main',
      'assets/chunk.mjs': 'chunk',
      'assets/index.js.map': 'map',
    });

    expect(
      readBuildScripts(distDir).sort((a, b) => a.file.localeCompare(b.file)),
    ).toEqual([
      { file: 'assets/chunk.mjs', text: 'chunk' },
      { file: 'assets/index.js', text: 'main' },
    ]);
  });
});

describe('readEagerFiles', () => {
  it('follows static imports written relative to the file', () => {
    const distDir = dist({
      'assets/index.js': 'import { a } from "./vendor.js";',
      'assets/vendor.js': 'export * from "../shared/util.js";',
      'shared/util.js': 'util',
    });

    expect(eagerFiles(distDir)).toEqual([
      'assets/index.js',
      'assets/vendor.js',
      'shared/util.js',
    ]);
  });

  it('follows static imports written from the site root, as esbuild writes them', () => {
    const distDir = dist({
      'assets/index.js': 'import"/assets/vendor.js";',
      'assets/vendor.js': 'vendor',
    });

    expect(eagerFiles(distDir)).toEqual([
      'assets/index.js',
      'assets/vendor.js',
    ]);
  });

  it('leaves out files loaded only with import()', () => {
    const distDir = dist({
      'assets/index.js': 'import("./page.js");',
      'assets/page.js': 'page',
    });

    expect(eagerFiles(distDir)).toEqual(['assets/index.js']);
  });

  it('stops on import cycles', () => {
    const distDir = dist({
      'assets/index.js': 'import "./other.js";',
      'assets/other.js': 'import "./index.js";',
    });

    expect(eagerFiles(distDir)).toEqual(['assets/index.js', 'assets/other.js']);
  });
});
