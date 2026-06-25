import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  loadAppEndpoints,
  resolveAppTargets,
  warnIfStaleLocalTargetUrlOverride,
} from '../app-port';

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

describe('resolveAppTargets', () => {
  it('uses TARGET_URL override in dev mode', () => {
    const targets = resolveAppTargets(
      { TARGET_URL: 'http://localhost:9999', BUNDLER: 'app-vite' },
      'dev',
    );
    expect(targets).toEqual({
      url: 'http://localhost:9999',
      port: '9999',
      source: 'TARGET_URL',
    });
  });

  it('uses TARGET_URL override in preview mode', () => {
    const targets = resolveAppTargets(
      { TARGET_URL: 'http://localhost:9999', BUNDLER: 'app-vite' },
      'preview',
    );
    expect(targets).toEqual({
      url: 'http://localhost:9999',
      port: '9999',
      source: 'TARGET_URL',
    });
  });

  it('defaults HTTP port when override URL omits an explicit port', () => {
    const targets = resolveAppTargets(
      { TARGET_URL: 'http://localhost' },
      'dev',
    );
    expect(targets).toEqual({
      url: 'http://localhost',
      port: '80',
      source: 'TARGET_URL',
    });
  });

  it('defaults HTTPS port when override URL omits an explicit port', () => {
    const targets = resolveAppTargets(
      { TARGET_URL: 'https://example.com' },
      'dev',
    );
    expect(targets).toEqual({
      url: 'https://example.com',
      port: '443',
      source: 'TARGET_URL',
    });
  });

  it('resolves dev targets from BUNDLER when override is unset', () => {
    const { devPort, devUrl } = loadAppEndpoints('app-vite', repoRoot);
    const targets = resolveAppTargets({ BUNDLER: 'app-vite' }, 'dev');
    expect(targets).toMatchObject({
      url: devUrl,
      port: String(devPort),
      source: 'BUNDLER',
      devPort,
    });
  });

  it('resolves preview targets from BUNDLER when override is unset', () => {
    const { previewPort, previewUrl } = loadAppEndpoints('app-vite', repoRoot);
    const targets = resolveAppTargets({ BUNDLER: 'app-vite' }, 'preview');
    expect(targets).toMatchObject({
      url: previewUrl,
      port: String(previewPort),
      source: 'BUNDLER',
      previewPort,
    });
  });

  it('returns null when BUNDLER is unset and override is unset in preview mode', () => {
    expect(resolveAppTargets({}, 'preview')).toBeNull();
  });
});

describe('warnIfStaleLocalTargetUrlOverride', () => {
  it('warns when localhost TARGET_URL overrides preview default', () => {
    const { devUrl, previewUrl } = loadAppEndpoints('app-vite', repoRoot);
    const warnings: string[] = [];

    warnIfStaleLocalTargetUrlOverride(
      { TARGET_URL: devUrl, BUNDLER: 'app-vite' },
      'preview',
      (message) => warnings.push(message),
    );

    expect(warnings).toEqual([
      `Warning: TARGET_URL (${devUrl}) overrides preview default (${previewUrl}). Unset TARGET_URL to use the BUNDLER preview default.`,
    ]);
  });

  it('does not warn when TARGET_URL matches mode default', () => {
    const { previewUrl } = loadAppEndpoints('app-vite', repoRoot);
    const warnings: string[] = [];

    warnIfStaleLocalTargetUrlOverride(
      { TARGET_URL: previewUrl, BUNDLER: 'app-vite' },
      'preview',
      (message) => warnings.push(message),
    );

    expect(warnings).toEqual([]);
  });

  it('does not warn for remote TARGET_URL overrides', () => {
    const warnings: string[] = [];

    warnIfStaleLocalTargetUrlOverride(
      { TARGET_URL: 'https://preview.example.com', BUNDLER: 'app-vite' },
      'preview',
      (message) => warnings.push(message),
    );

    expect(warnings).toEqual([]);
  });

  it('does not warn when TARGET_URL is unset', () => {
    const warnings: string[] = [];

    warnIfStaleLocalTargetUrlOverride(
      { BUNDLER: 'app-vite' },
      'preview',
      (message) => warnings.push(message),
    );

    expect(warnings).toEqual([]);
  });
});
