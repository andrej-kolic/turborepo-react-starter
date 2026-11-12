import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PORT = 9555;

/** @type {string} */
let home;
/** @type {string} */
let pidFile;
/** @type {typeof import('../lifecycle.js').stop} */
let stop;

/**
 * @param {string} code
 * @returns {Error & { code: string }}
 */
function killError(code) {
  return Object.assign(new Error(`kill ${code}`), { code });
}

beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-tools-lifecycle-'));
  vi.spyOn(os, 'homedir').mockReturnValue(home);
  vi.resetModules();
  ({ stop } = await import('../lifecycle.js'));
  const dir = path.join(home, '.chrome-debugging-sessions');
  fs.mkdirSync(dir);
  pidFile = path.join(dir, `chrome.${PORT}.pid`);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});

describe('stop', () => {
  it('reports not running when there is no PID file', () => {
    expect(stop({ port: PORT })).toEqual({ running: false, stopped: false });
  });

  it('kills the process and removes the PID file', () => {
    fs.writeFileSync(pidFile, '4242\n');
    const kill = vi.spyOn(process, 'kill').mockReturnValue(true);

    expect(stop({ port: PORT })).toEqual({
      running: false,
      stopped: true,
      pid: '4242',
    });
    expect(kill).toHaveBeenCalledWith(4242);
    expect(fs.existsSync(pidFile)).toBe(false);
  });

  it('removes a stale PID file when the process is already gone', () => {
    fs.writeFileSync(pidFile, '4242');
    vi.spyOn(process, 'kill').mockImplementation(() => {
      throw killError('ESRCH');
    });

    expect(stop({ port: PORT })).toEqual({
      running: false,
      stopped: false,
      pid: '4242',
    });
    expect(fs.existsSync(pidFile)).toBe(false);
  });

  it('reports a failure and keeps the PID file when the kill is refused', () => {
    fs.writeFileSync(pidFile, '4242');
    vi.spyOn(process, 'kill').mockImplementation(() => {
      throw killError('EPERM');
    });

    expect(stop({ port: PORT })).toEqual({
      running: true,
      stopped: false,
      pid: '4242',
      error: 'kill EPERM',
    });
    expect(fs.existsSync(pidFile)).toBe(true);
  });

  it('never signals a PID file that is not a plain number', () => {
    fs.writeFileSync(pidFile, '1; touch /tmp/pwned');
    const kill = vi.spyOn(process, 'kill');

    expect(stop({ port: PORT })).toEqual({
      running: false,
      stopped: false,
      pid: '1; touch /tmp/pwned',
    });
    expect(kill).not.toHaveBeenCalled();
    expect(fs.existsSync(pidFile)).toBe(false);
  });
});
