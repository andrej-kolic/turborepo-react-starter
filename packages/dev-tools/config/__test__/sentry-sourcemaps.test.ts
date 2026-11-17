import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SentryCli } from '@sentry/cli';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadSourceMaps } from '../sentry-sourcemaps';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
const spawnSyncMock = vi.mocked(spawnSync);

const CONFIGURED = {
  config: { org: 'my-org', project: 'my-project' },
  auth: { type: 'token' },
};
const UNCONFIGURED = {
  config: { org: null, project: null },
  auth: { type: null },
};

let distDir: string;

// Fakes the sentry-cli process: `info` prints the given status, inject and upload exit with the given codes.
function fakeSentryCli({
  status,
  injectExit = 0,
  uploadExit = 0,
}: {
  status: object;
  injectExit?: number;
  uploadExit?: number;
}) {
  spawnSyncMock.mockImplementation(((_cli: string, args: string[]) => {
    if (args[0] === 'info') {
      return { status: 0, stdout: JSON.stringify(status), stderr: '' };
    }
    return { status: args[1] === 'inject' ? injectExit : uploadExit };
  }) as unknown as typeof spawnSync);
}

function sentryCliCommands() {
  return spawnSyncMock.mock.calls.map(([, args]) => args?.slice(0, 2));
}

function upload() {
  return uploadSourceMaps({
    distDir,
    sentryCli: 'sentry-cli',
  });
}

beforeEach(() => {
  distDir = mkdtempSync(join(tmpdir(), 'dev-tools-sourcemaps-'));
  mkdirSync(join(distDir, 'assets'));
  writeFileSync(join(distDir, 'assets/index.js'), 'code');
  writeFileSync(join(distDir, 'assets/index.js.map'), '{}');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  spawnSyncMock.mockReset();
  rmSync(distDir, { recursive: true, force: true });
});

describe('uploadSourceMaps', () => {
  it('skips the upload and deletes the maps when credentials are missing', () => {
    fakeSentryCli({ status: UNCONFIGURED });

    expect(upload()).toBe(true);
    expect(sentryCliCommands()).toEqual([['info', '--config-status-json']]);
    expect(existsSync(join(distDir, 'assets/index.js.map'))).toBe(false);
    expect(existsSync(join(distDir, 'assets/index.js'))).toBe(true);
  });

  it('injects, uploads with --strict, and deletes the maps', () => {
    fakeSentryCli({ status: CONFIGURED });

    expect(upload()).toBe(true);
    expect(spawnSyncMock.mock.calls.map(([, args]) => args)).toEqual([
      ['info', '--config-status-json'],
      ['sourcemaps', 'inject', distDir],
      ['sourcemaps', 'upload', '--strict', distDir],
    ]);
    expect(existsSync(join(distDir, 'assets/index.js.map'))).toBe(false);
  });

  it('warns, passes and still deletes the maps when the upload fails', () => {
    fakeSentryCli({ status: CONFIGURED, uploadExit: 1 });

    expect(upload()).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('upload failed'),
    );
    expect(existsSync(join(distDir, 'assets/index.js.map'))).toBe(false);
  });

  it('warns and passes without uploading when inject fails', () => {
    fakeSentryCli({ status: CONFIGURED, injectExit: 1 });

    expect(upload()).toBe(true);
    expect(sentryCliCommands()).not.toContainEqual(['sourcemaps', 'upload']);
  });

  it('warns, passes and still deletes the maps when the sentry-cli binary is missing', () => {
    vi.spyOn(SentryCli, 'getPath').mockImplementation(() => {
      throw new Error(
        'Sentry CLI binary for this platform/architecture not found!',
      );
    });

    expect(uploadSourceMaps({ distDir })).toBe(true);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('upload failed'),
    );
    expect(existsSync(join(distDir, 'assets/index.js.map'))).toBe(false);
  });

  it('fails when a map is left after the delete', () => {
    fakeSentryCli({ status: UNCONFIGURED });
    // A directory named like a map can't be removed by rmSync without recursive, so it is left.
    mkdirSync(join(distDir, 'assets/left.map'));

    expect(upload()).toBe(false);
  });
});
