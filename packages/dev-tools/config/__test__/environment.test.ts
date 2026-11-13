import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadEnvironmentVariables } from '../environment';

const VALID_ENV_FILE = [
  'APP_REACT_TITLE="Test App"',
  'APP_REACT_ENV_FILE=".env"',
  'APP_REACT_VERSION="1.2.3"',
].join('\n');

let envDir: string;
let originalEnv: NodeJS.ProcessEnv;

function writeEnvFile(contents: string) {
  writeFileSync(join(envDir, '.env'), contents);
}

function load(customEnvVars: Record<string, string> = { BUNDLER: 'app-vite' }) {
  return loadEnvironmentVariables({
    envDir,
    buildEnvironment: 'staging',
    customEnvVars,
  });
}

beforeEach(() => {
  envDir = mkdtempSync(join(tmpdir(), 'dev-tools-env-'));
  originalEnv = process.env;
  // dotenv-flow writes into process.env; give each test its own copy without APP_REACT_* keys.
  process.env = Object.fromEntries(
    Object.entries(originalEnv).filter(([key]) => !key.startsWith('APP_REACT')),
  );
});

afterEach(() => {
  process.env = originalEnv;
  rmSync(envDir, { recursive: true, force: true });
});

describe('loadEnvironmentVariables', () => {
  it('returns the validated variables when the env is valid', () => {
    writeEnvFile(VALID_ENV_FILE);

    expect(load()).toEqual({
      APP_REACT_TITLE: 'Test App',
      APP_REACT_ENV_FILE: '.env',
      APP_REACT_VERSION: '1.2.3',
      BUILD_ENVIRONMENT: 'staging',
      BUNDLER: 'app-vite',
    });
  });

  it('throws naming the variable when a required one is missing', () => {
    writeEnvFile('APP_REACT_ENV_FILE=".env"\nAPP_REACT_VERSION="1.2.3"');

    expect(() => load()).toThrow(/APP_REACT_TITLE/);
  });

  it('throws when APP_REACT_VERSION is not semver', () => {
    writeEnvFile(VALID_ENV_FILE.replace('1.2.3', 'latest'));

    expect(() => load()).toThrow(/must be a semver version/);
  });

  it('throws when an APP_REACT_* variable is not in the schema', () => {
    writeEnvFile(`${VALID_ENV_FILE}\nAPP_REACT_TYPO="x"`);

    expect(() => load()).toThrow(/APP_REACT_TYPO/);
  });

  it('throws when BUNDLER is unknown', () => {
    writeEnvFile(VALID_ENV_FILE);

    expect(() => load({ BUNDLER: 'app-webpack' })).toThrow(/BUNDLER/);
  });

  it('ignores variables without the prefix', () => {
    writeEnvFile(`${VALID_ENV_FILE}\nOTHER="x"`);

    expect(load()).not.toHaveProperty('OTHER');
  });
});
