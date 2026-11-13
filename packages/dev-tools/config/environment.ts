import dotenvFlow from 'dotenv-flow';
import util from 'util';
import { z } from 'zod';
import { environmentSchema } from '@repo/client-types/env-schema';

const debuglog = util.debuglog('dev-tools');

// Fixed: environmentSchema only knows APP_REACT_* keys.
const PREFIX = 'APP_REACT';

/**
 * Load variables from .env files and process.env. Meant to be used in bundlers.
 * 1. Load .env files from envDir, based on buildEnvironment
 * 2. Merge with process.env (process.env has precedence)
 * 3. Filter only variables with PREFIX
 * 4. Enhance with BUILD_ENVIRONMENT and customEnvVars
 * 5. Validate against `environmentSchema`
 *
 * @param envDir directory where .env files are located
 * @param buildEnvironment environment name, e.g. 'development', 'production', 'staging'
 * @param customEnvVars extra values, e.g. BUNDLER and MODE
 *
 * @returns validated environment variables to be used in the app
 * @throws Error listing every invalid or unknown variable
 */
export function loadEnvironmentVariables({
  envDir,
  buildEnvironment,
  customEnvVars,
}: {
  envDir: string;
  buildEnvironment: string;
  customEnvVars?: Record<string, string>;
}) {
  // load .env files
  const variables = dotenvFlow.config({
    node_env: buildEnvironment,
    default_node_env: 'development',
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

  // enhance with BUILD_ENVIRONMENT and customEnvVars
  const finalEnvMap = {
    ...filteredEnvMap,
    BUILD_ENVIRONMENT: buildEnvironment,
    ...customEnvVars,
  };
  debuglog('final variable map:', finalEnvMap);

  const result = environmentSchema.safeParse(finalEnvMap);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables (env files in ${envDir}, BUILD_ENVIRONMENT=${buildEnvironment}):\n` +
        z.prettifyError(result.error),
    );
  }

  return result.data;
}
