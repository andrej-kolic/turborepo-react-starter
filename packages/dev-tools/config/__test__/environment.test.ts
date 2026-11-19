import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenvFlow from 'dotenv-flow';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environmentSchema } from '@repo/client-types/env-schema';
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

function writeEnvFile(contents: string, name = '.env') {
  writeFileSync(join(envDir, name), contents);
}

function load(
  customEnvVars: Record<string, string | boolean> = {
    BUNDLER: 'app-vite',
    MODE: 'production',
    PROD: true,
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
  // dotenv-flow writes into process.env; give each test its own copy without APP_REACT_* keys or a profile.
  process.env = Object.fromEntries(
    Object.entries(originalEnv).filter(
      ([key]) => !key.startsWith('APP_REACT') && key !== 'BUILD_PROFILE',
    ),
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
      PROD: true,
      APP_REACT_SENTRY_TRACES_SAMPLE_RATE: 0.1,
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

  it('treats an empty APP_REACT_SENTRY_DSN as unset', () => {
    process.env.APP_REACT_SENTRY_DSN = '';
    writeEnvFile(VALID_ENV_FILE);

    expect(load().APP_REACT_SENTRY_DSN).toBeUndefined();
  });

  it('throws when APP_REACT_SENTRY_DSN is not a URL', () => {
    writeEnvFile(`${VALID_ENV_FILE}\nAPP_REACT_SENTRY_DSN="not-a-url"`);

    expect(() => load()).toThrow(/APP_REACT_SENTRY_DSN/);
  });

  it('reads APP_REACT_SENTRY_TRACES_SAMPLE_RATE as a number', () => {
    writeEnvFile(
      `${VALID_ENV_FILE}\nAPP_REACT_SENTRY_TRACES_SAMPLE_RATE="0.25"`,
    );

    expect(load().APP_REACT_SENTRY_TRACES_SAMPLE_RATE).toBe(0.25);
  });

  it('treats an empty APP_REACT_SENTRY_TRACES_SAMPLE_RATE as unset', () => {
    process.env.APP_REACT_SENTRY_TRACES_SAMPLE_RATE = '';
    writeEnvFile(VALID_ENV_FILE);

    expect(load().APP_REACT_SENTRY_TRACES_SAMPLE_RATE).toBe(0.1);
  });

  it.each(['1.5', '-0.1', 'all'])(
    'throws when APP_REACT_SENTRY_TRACES_SAMPLE_RATE is %s',
    (rate) => {
      writeEnvFile(
        `${VALID_ENV_FILE}\nAPP_REACT_SENTRY_TRACES_SAMPLE_RATE="${rate}"`,
      );

      expect(() => load()).toThrow(/APP_REACT_SENTRY_TRACES_SAMPLE_RATE/);
    },
  );

  it('sets GIT_COMMIT to the commit checked out in envDir', () => {
    writeEnvFile(VALID_ENV_FILE);
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: envDir, encoding: 'utf8' }).trim();
    git('init', '-q');
    git(
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-q',
      '--allow-empty',
      '-m',
      'test',
    );

    expect(load().GIT_COMMIT).toBe(git('rev-parse', 'HEAD'));
  });

  it('leaves GIT_COMMIT unset outside a git checkout', () => {
    writeEnvFile(VALID_ENV_FILE);

    expect(load().GIT_COMMIT).toBeUndefined();
  });

  it('throws when an APP_REACT_* variable is not in the schema', () => {
    writeEnvFile(`${VALID_ENV_FILE}\nAPP_REACT_TYPO="x"`);

    expect(() => load()).toThrow(/APP_REACT_TYPO/);
  });

  it('throws when BUNDLER is unknown', () => {
    writeEnvFile(VALID_ENV_FILE);

    expect(() =>
      load({ BUNDLER: 'app-webpack', MODE: 'production', PROD: true }),
    ).toThrow(/BUNDLER/);
  });

  it('throws naming PROD when the bundler does not set it', () => {
    writeEnvFile(VALID_ENV_FILE);

    expect(() => load({ BUNDLER: 'app-vite', MODE: 'production' })).toThrow(
      /PROD/,
    );
  });

  it('ignores variables without the prefix', () => {
    writeEnvFile(`${VALID_ENV_FILE}\nOTHER="x"`);

    expect(load()).not.toHaveProperty('OTHER');
  });
});

describe('loadEnvironmentVariables with BUILD_PROFILE', () => {
  beforeEach(() => {
    writeEnvFile(VALID_ENV_FILE);
    writeEnvFile('APP_REACT_ENV_FILE=".env.local"', '.env.local');
    writeEnvFile('APP_REACT_ENV_FILE=".env.staging"', '.env.staging');
    writeEnvFile('APP_REACT_GUARD_ON="true"', '.env.staging.local');
    writeEnvFile('APP_REACT_GUARD_OFF="true"', '.env.features');
  });

  it('loads the .local files and not .env.features without a profile', () => {
    const variables = load();

    expect(variables.APP_REACT_ENV_FILE).toBe('.env.staging');
    expect(variables.APP_REACT_GUARD_ON).toBe('true');
    expect(variables.APP_REACT_GUARD_OFF).toBeUndefined();
  });

  it('treats an empty BUILD_PROFILE as unset', () => {
    process.env.BUILD_PROFILE = '';

    expect(load().APP_REACT_GUARD_ON).toBe('true');
  });

  it('loads .env and .env.<environment> only on bare', () => {
    process.env.BUILD_PROFILE = 'bare';
    writeEnvFile('APP_REACT_TITLE="Local title"', '.env.local');

    const variables = load();

    expect(variables.APP_REACT_TITLE).toBe('Test App');
    expect(variables.APP_REACT_ENV_FILE).toBe('.env.staging');
    expect(variables.APP_REACT_GUARD_ON).toBeUndefined();
    expect(variables.APP_REACT_GUARD_OFF).toBeUndefined();
  });

  it('adds .env.features on features, still without the .local files', () => {
    process.env.BUILD_PROFILE = 'features';

    const variables = load();

    expect(variables.APP_REACT_GUARD_OFF).toBe('true');
    expect(variables.APP_REACT_GUARD_ON).toBeUndefined();
  });

  it('lets a shell variable win over .env.features', () => {
    process.env.BUILD_PROFILE = 'features';
    process.env.APP_REACT_GUARD_OFF = '';

    expect(() => load()).toThrow(/APP_REACT_GUARD_OFF/);
  });

  it('throws naming the profiles when BUILD_PROFILE is unknown', () => {
    process.env.BUILD_PROFILE = 'full';

    expect(() => load()).toThrow(
      /Unknown BUILD_PROFILE "full": use bare or features/,
    );
  });
});

describe('packages/app-core/.env.features', () => {
  const appCoreDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../app-core',
  );
  // Not optional features: computed by the loader, or test switches for pnpm check:env-guards.
  const notFeatures = new Set([
    'GIT_COMMIT',
    'APP_REACT_GUARD_ON',
    'APP_REACT_GUARD_OFF',
  ]);

  it('sets every optional key in the env schema, so the features build turns every feature on', () => {
    const optionalKeys = Object.entries(environmentSchema.shape)
      .filter(([, schema]) => schema.safeParse(undefined).success)
      .map(([key]) => key)
      .filter((key) => !notFeatures.has(key));

    const setKeys = Object.entries(
      dotenvFlow.parse(join(appCoreDir, '.env.features')),
    )
      .filter(([, value]) => value !== '')
      .map(([key]) => key);

    expect(optionalKeys.length).toBeGreaterThan(0);
    expect(setKeys).toEqual(expect.arrayContaining(optionalKeys));
  });

  it('samples every visit, so the web vitals E2E test always gets its spans', () => {
    process.env.BUILD_PROFILE = 'features';

    const variables = loadEnvironmentVariables({
      envDir: appCoreDir,
      buildEnvironment: 'staging',
      customEnvVars: { BUNDLER: 'app-vite', MODE: 'production', PROD: true },
    });

    expect(variables.APP_REACT_SENTRY_TRACES_SAMPLE_RATE).toBe(1);
    expect(variables.APP_REACT_SENTRY_DSN).toBeDefined();
  });
});

describe('defineEnvironmentVariables', () => {
  const values = {
    BUILD_ENVIRONMENT: 'staging',
    BUNDLER: 'app-esbuild',
    MODE: 'production',
    PROD: false,
    APP_REACT_ENV_FILE: '.env',
    APP_REACT_TITLE: 'Test "App"',
    APP_REACT_VERSION: '1.2.3',
    APP_REACT_GUARD_ON: 'true',
    APP_REACT_SENTRY_TRACES_SAMPLE_RATE: 0.1,
  } as const;

  it('defines each import.meta.env key as its value in code form', () => {
    expect(defineEnvironmentVariables(values)).toEqual({
      'import.meta.env.BUILD_ENVIRONMENT': '"staging"',
      'import.meta.env.BUNDLER': '"app-esbuild"',
      'import.meta.env.MODE': '"production"',
      'import.meta.env.PROD': 'false',
      'import.meta.env.APP_REACT_ENV_FILE': '".env"',
      'import.meta.env.APP_REACT_TITLE': '"Test \\"App\\""',
      'import.meta.env.APP_REACT_VERSION': '"1.2.3"',
      'import.meta.env.APP_REACT_GUARD_ON': '"true"',
      'import.meta.env.APP_REACT_GUARD_OFF': 'undefined',
      'import.meta.env.APP_REACT_SENTRY_DSN': 'undefined',
      'import.meta.env.APP_REACT_SENTRY_TRACES_SAMPLE_RATE': '0.1',
      'import.meta.env.GIT_COMMIT': 'undefined',
    });
  });

  it('defines a schema key without a value as undefined', () => {
    expect(defineEnvironmentVariables(values)).toHaveProperty(
      ['import.meta.env.APP_REACT_GUARD_OFF'],
      'undefined',
    );
  });
});
