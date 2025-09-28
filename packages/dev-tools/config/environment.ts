import dotenvFlow from 'dotenv-flow';

// TODO: add prefix as part of 'options' argument in getEnvVariables()
/**
 * add only variables with this prefix to import.meta.env
 */
const PREFIX = 'APP_REACT';

// TODO: rename to loadEnvVariables()
// TODO: object arguments
// TODO: provided env var map to merge with
export function getEnvVariables(
  envDir: string,
  buildEnvironment: string,
  bundler: string,
) {
  // TODO: use debug
  console.log('');
  console.log('* process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('* process.env.BUILD_ENVIRONMENT', process.env.BUILD_ENVIRONMENT);
  console.log('');

  const variables = dotenvFlow.config({
    node_env: buildEnvironment,
    default_node_env: 'development',
    path: envDir,
    debug: false,
  });
  console.log(
    '* parsed variables from .env files',
    typeof variables,
    variables.parsed,
  );

  const processEnvMap: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    // console.log(`Key: ${key}, Value: ${value}`);
    if (key.startsWith(PREFIX)) {
      processEnvMap[key] = value;
    }
  }
  console.log('* process map:', processEnvMap);

  const BUNDLER = bundler;
  const MODE = buildEnvironment;

  return {
    ...processEnvMap,
    BUNDLER,
    MODE,
  };
}
