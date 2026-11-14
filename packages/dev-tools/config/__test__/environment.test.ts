import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  defineEnvironmentVariables,
  loadEnvironmentVariables,
} from '../environment';

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

function load(
  customEnvVars: Record<string, string> = {
    BUNDLER: 'app-vite',
    MODE: 'production',
  },
) {
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
      MODE: 'production',
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

  it('accepts a pre-release and build suffix in APP_REACT_VERSION', () => {
    writeEnvFile(VALID_ENV_FILE.replace('1.2.3', '1.2.3-rc.1+build.5'));

    expect(load().APP_REACT_VERSION).toBe('1.2.3-rc.1+build.5');
  });

  it('throws when an APP_REACT_* variable is not in the schema', () => {
    writeEnvFile(`${VALID_ENV_FILE}\nAPP_REACT_TYPO="x"`);

    expect(() => load()).toThrow(/APP_REACT_TYPO/);
  });

  it('throws when BUNDLER is unknown', () => {
    writeEnvFile(VALID_ENV_FILE);

    expect(() => load({ BUNDLER: 'app-webpack', MODE: 'production' })).toThrow(
      /BUNDLER/,
    );
  });

  it('ignores variables without the prefix', () => {
    writeEnvFile(`${VALID_ENV_FILE}\nOTHER="x"`);

    expect(load()).not.toHaveProperty('OTHER');
  });
});

describe('defineEnvironmentVariables', () => {
  const values = {
    BUILD_ENVIRONMENT: 'staging',
    BUNDLER: 'app-esbuild',
    MODE: 'production',
    APP_REACT_ENV_FILE: '.env',
    APP_REACT_TITLE: 'Test "App"',
    APP_REACT_VERSION: '1.2.3',
    APP_REACT_GUARD_ON: 'true',
  } as const;

  it('defines each import.meta.env key as its value in code form', () => {
    expect(defineEnvironmentVariables(values)).toEqual({
      'import.meta.env.BUILD_ENVIRONMENT': '"staging"',
      'import.meta.env.BUNDLER': '"app-esbuild"',
      'import.meta.env.MODE': '"production"',
      'import.meta.env.APP_REACT_ENV_FILE': '".env"',
      'import.meta.env.APP_REACT_TITLE': '"Test \\"App\\""',
      'import.meta.env.APP_REACT_VERSION': '"1.2.3"',
      'import.meta.env.APP_REACT_GUARD_ON': '"true"',
      'import.meta.env.APP_REACT_GUARD_OFF': 'undefined',
    });
  });

  it('defines a schema key without a value as undefined', () => {
    expect(defineEnvironmentVariables(values)).toHaveProperty(
      ['import.meta.env.APP_REACT_GUARD_OFF'],
      'undefined',
    );
  });
});
