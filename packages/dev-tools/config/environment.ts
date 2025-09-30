import dotenvFlow from 'dotenv-flow';

const PREFIX = 'APP_REACT';

// TODO: rename to loadEnvVariables()
// TODO: object arguments
// TODO: provided env var map to merge with

// TODO: add prefix as part of 'options' argument in getEnvVariables()

/**
 * Load variables from .env files and process.env. Meant to be used in bundlers.
 * 1. Load .env files from envDir, based on buildEnvironment
 * 2. Merge with process.env (process.env has precedence)
 * 3. Filter only variables with PREFIX
 * 4. Enhance with BUNDLER, MODE, BUILD_ENVIRONMENT
 *
 * @param envDir directory where .env files are located
 * @param buildEnvironment environment name, e.g. 'development', 'production', 'staging'
 * @param bundler bundler name, e.g. 'vite', 'webpack', 'esbuild'
 *
 * @returns object with environment variables to be used in the app
 */
export function getEnvVariables(
  envDir: string,
  buildEnvironment: string,
  bundler: string,
) {
  console.log('1. process.env (before load):', process.env);

  // TODO: use debug
  // console.log('');
  // console.log('* process.env.HELLO: ', process.env.HELLO);
  // console.log('* process.env.NODE_ENV:', process.env.NODE_ENV);
  // console.log('* process.env.BUILD_ENVIRONMENT', process.env.BUILD_ENVIRONMENT);
  // console.log('');

  // load .env files
  const variables = dotenvFlow.config({
    node_env: buildEnvironment,
    default_node_env: 'development',
    path: envDir,
    debug: false,
  });
  console.log(
    '2. parsed variables from .env files',
    typeof variables,
    variables.parsed,
  );

  console.log('3. process.env (after load):', process.env);

  // filter only variables with PREFIX
  const filteredEnvMap: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    // console.log(`Key: ${key}, Value: ${value}`);
    if (key.startsWith(PREFIX)) {
      filteredEnvMap[key] = value;
    }
  }
  console.log('4. filtered env map:', filteredEnvMap);

  const BUNDLER = bundler;
  const MODE = buildEnvironment;
  const BUILD_ENVIRONMENT = buildEnvironment;

  // enhance with BUNDLER, MODE, BUILD_ENVIRONMENT (TODO: change to include custom map)
  const enhancedEnvMap = {
    ...filteredEnvMap,
    BUNDLER,
    MODE,
    BUILD_ENVIRONMENT,
  };
  console.log('5. enhanced env map:', enhancedEnvMap);

  return enhancedEnvMap;
}
