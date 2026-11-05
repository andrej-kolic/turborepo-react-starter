import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadAppEndpoints } from '../app-port';
import { resolveRunChildEnv } from '../run-child-env';

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

describe('resolveRunChildEnv', () => {
  it('passes through pre-set TARGET_URL without resolving from BUNDLER', () => {
    const { devUrl } = loadAppEndpoints('app-vite', repoRoot);

    const env = resolveRunChildEnv(
      {
        TARGET_URL: 'http://localhost:9999',
        BUNDLER: 'app-vite',
      },
      { warn: () => {} },
    );

    expect(env.TARGET_URL).toBe('http://localhost:9999');
    expect(env.TARGET_URL).not.toBe(devUrl);
  });

  it('warns when passthrough TARGET_URL differs from dev default', () => {
    const { devUrl, previewUrl } = loadAppEndpoints('app-vite', repoRoot);
    const warnings: string[] = [];

    resolveRunChildEnv(
      { TARGET_URL: previewUrl, BUNDLER: 'app-vite' },
      { warn: (message) => warnings.push(message) },
    );

    expect(warnings).toEqual([
      `Warning: TARGET_URL (${previewUrl}) overrides dev default (${devUrl}). Unset TARGET_URL to use the BUNDLER dev default.`,
    ]);
  });

  it('injects TARGET_URL from BUNDLER dev default when unset', () => {
    const { devUrl } = loadAppEndpoints('app-vite', repoRoot);

    const env = resolveRunChildEnv({ BUNDLER: 'app-vite' });

    expect(env.TARGET_URL).toBe(devUrl);
  });
});
