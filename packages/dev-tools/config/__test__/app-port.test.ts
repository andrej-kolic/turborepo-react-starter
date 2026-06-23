import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadAppEndpoints, resolveAppTargets } from '../app-port';

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

describe('resolveAppTargets', () => {
  it('uses APP_URL for dev mode', () => {
    const targets = resolveAppTargets(
      { APP_URL: 'http://localhost:9999', BUNDLER: 'app-vite' },
      'dev',
    );
    expect(targets).toEqual({
      url: 'http://localhost:9999',
      port: '9999',
      source: 'APP_URL',
    });
  });

  it('defaults HTTP port when APP_URL omits an explicit port', () => {
    const targets = resolveAppTargets({ APP_URL: 'http://localhost' }, 'dev');
    expect(targets).toEqual({
      url: 'http://localhost',
      port: '80',
      source: 'APP_URL',
    });
  });

  it('defaults HTTPS port when APP_URL omits an explicit port', () => {
    const targets = resolveAppTargets(
      { APP_URL: 'https://example.com' },
      'dev',
    );
    expect(targets).toEqual({
      url: 'https://example.com',
      port: '443',
      source: 'APP_URL',
    });
  });

  it('ignores APP_URL in preview mode and uses BUNDLER preview endpoints', () => {
    const { previewPort, previewUrl } = loadAppEndpoints('app-vite', repoRoot);
    const targets = resolveAppTargets(
      { APP_URL: 'http://localhost:9999', BUNDLER: 'app-vite' },
      'preview',
    );
    expect(targets).toMatchObject({
      url: previewUrl,
      port: String(previewPort),
      source: 'BUNDLER',
      previewPort,
    });
  });

  it('returns null when BUNDLER is unset in preview mode', () => {
    expect(
      resolveAppTargets({ APP_URL: 'http://localhost:9999' }, 'preview'),
    ).toBeNull();
  });

  it('resolves dev targets from BUNDLER when APP_URL is unset', () => {
    const { devPort, devUrl } = loadAppEndpoints('app-vite', repoRoot);
    const targets = resolveAppTargets({ BUNDLER: 'app-vite' }, 'dev');
    expect(targets).toMatchObject({
      url: devUrl,
      port: String(devPort),
      source: 'BUNDLER',
      devPort,
    });
  });
});
