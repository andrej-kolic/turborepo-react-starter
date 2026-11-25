import { execFileSync } from 'node:child_process';
import dotenvFlow from 'dotenv-flow';
import util from 'util';
import { z } from 'zod';
import {
  environmentSchema,
  type EnvironmentVariables,
} from '@repo/client-types/env-schema';

const debuglog = util.debuglog('dev-tools');

// Fixed: environmentSchema only knows APP_REACT_* keys.
const PREFIX = 'APP_REACT';

// The builds every check runs on (docs/template/build-profiles.md): no optional features, or all of them.
const BUILD_PROFILES = ['bare', 'features'] as const;

type BuildProfile = (typeof BUILD_PROFILES)[number];

/**
 * The profile `BUILD_PROFILE` names, or undefined when it is unset or empty: a build without a profile,
 * such as a deploy build.
 *
 * @throws Error when `BUILD_PROFILE` names no profile
 */
export function readBuildProfile(): BuildProfile | undefined {
  const value = process.env.BUILD_PROFILE;
  if (!value) return undefined;
  const profile = BUILD_PROFILES.find((name) => name === value);
  if (!profile) {
    throw new Error(
      `Unknown BUILD_PROFILE "${value}": use ${BUILD_PROFILES.join(' or ')}.`,
    );
  }
  return profile;
}

/**
 * The env files to load, in order: a later file beats an earlier one (docs/template/env.md).
 * Each file is followed by its `.local` twin, except with a profile: a check must never read a developer's
 * secrets from a .local file.
 */
function envFiles({
  buildEnvironment,
  devServer,
  profile,
}: {
  buildEnvironment: string;
  devServer: boolean;
  profile: BuildProfile | undefined;
}) {
  const files = [
    '.env',
    `.env.${buildEnvironment}`,
    ...(devServer ? ['.env.dev-server'] : []),
    ...(profile === 'features' ? ['.env.features'] : []),
  ];
  return profile ? files : files.flatMap((file) => [file, `${file}.local`]);
}

// The commit checked out in `dir`, or undefined outside a git checkout (e.g. a downloaded zip).
// Read here, not passed in, so local and CI builds get it the same way, as Sentry's bundler plugins do.
function readGitCommit(dir: string) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Load variables from .env files and process.env. Meant to be used in bundlers.
 * 1. Load .env files from envDir, a later one beating an earlier one: `.env`, `.env.<buildEnvironment>`,
 *    `.env.dev-server` for the dev server, `.env.features` on the `features` profile. Each is followed by
 *    its `.local` twin, unless `BUILD_PROFILE` is set
 * 2. Merge with process.env (process.env has precedence)
 * 3. Filter only variables with PREFIX
 * 4. Enhance with BUILD_ENVIRONMENT, GIT_COMMIT (the commit checked out in envDir) and customEnvVars
 * 5. Validate against `environmentSchema`
 *
 * @param envDir directory where .env files are located
 * @param buildEnvironment environment name, e.g. 'development', 'production', 'staging'
 * @param devServer true for the dev server, false for a build or a preview of one
 * @param customEnvVars extra values, e.g. BUNDLER, MODE and PROD
 *
 * @returns validated environment variables to be used in the app
 * @throws Error listing every invalid or unknown variable, or when `BUILD_PROFILE` names no profile
 */
export function loadEnvironmentVariables({
  envDir,
  buildEnvironment,
  devServer,
  customEnvVars,
}: {
  envDir: string;
  buildEnvironment: string;
  devServer: boolean;
  customEnvVars?: Record<string, string | boolean>;
}) {
  const profile = readBuildProfile();
  // load .env files
  const variables = dotenvFlow.config({
    files: envFiles({ buildEnvironment, devServer, profile }),
    path: envDir,
    debug: false,
  });
  debuglog('loaded variables from .env files:', variables.parsed);

  // filter only variables with PREFIX
  const filteredEnvMap: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    // debuglog(`Key: ${key}, Value: ${value}`);
    if (key.startsWith(PREFIX)) {
      filteredEnvMap[key] = value;
    }
  }
  debuglog(
    `filtered variables from process.env (using prefix: ${PREFIX}):`,
    filteredEnvMap,
  );

  debuglog('custom variables:', customEnvVars);

  // enhance with BUILD_ENVIRONMENT, GIT_COMMIT and customEnvVars
  const finalEnvMap = {
    ...filteredEnvMap,
    BUILD_ENVIRONMENT: buildEnvironment,
    GIT_COMMIT: readGitCommit(envDir),
    ...customEnvVars,
  };
  debuglog('final variable map:', finalEnvMap);

  const result = environmentSchema.safeParse(finalEnvMap);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables (env files in ${envDir}, BUILD_ENVIRONMENT=${buildEnvironment}${profile ? `, BUILD_PROFILE=${profile}` : ''}):\n` +
        z.prettifyError(result.error),
    );
  }

  return result.data;
}

/**
 * Bundler `define` entries that replace each `import.meta.env.<KEY>` in the schema with its value at build time.
 * A key without a value becomes `undefined`, so the minifier drops code that an `if` on it guards.
 * Works as Vite `define`, Rspack `DefinePlugin` and esbuild `define`.
 */
export function defineEnvironmentVariables(
  environmentVariables: Readonly<EnvironmentVariables>,
) {
  return Object.fromEntries(
    environmentSchema.keyof().options.map((key) => {
      const value = environmentVariables[key];
      return [
        `import.meta.env.${key}`,
        value === undefined ? 'undefined' : JSON.stringify(value),
      ];
    }),
  );
}
