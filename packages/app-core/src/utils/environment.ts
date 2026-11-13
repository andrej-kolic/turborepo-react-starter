const environmentVariables = {
  BUILD_ENVIRONMENT: import.meta.env.BUILD_ENVIRONMENT,
  BUNDLER: import.meta.env.BUNDLER,
  MODE: import.meta.env.MODE,

  APP_REACT_ENV_FILE: import.meta.env.APP_REACT_ENV_FILE,
  APP_REACT_TITLE: import.meta.env.APP_REACT_TITLE,
  APP_REACT_VERSION: import.meta.env.APP_REACT_VERSION,
};

// TODO: rename to getRuntimeEnvVariables() or getAppconfig()
/**
 * Returns bundler-injected app config from import.meta.env.
 * Values are fixed at build time, not read from runtime process.env.
 */
export function getEnvironmentVariables() {
  return environmentVariables;
}
