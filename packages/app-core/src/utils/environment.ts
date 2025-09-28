export type EnvironmentVariables = {
  // set by bundler
  readonly BUNDLER: string;
  readonly MODE: string;

  // client
  readonly APP_REACT_ENV_FILE: string;
  readonly APP_REACT_TITLE: string;
};

const environmentVariables: EnvironmentVariables = {
  BUNDLER: import.meta.env.BUNDLER,
  MODE: import.meta.env.MODE,

  APP_REACT_ENV_FILE: import.meta.env.APP_REACT_ENV_FILE,
  APP_REACT_TITLE: import.meta.env.APP_REACT_TITLE,
};

// TODO: rename to getRuntimeEnvVariables()
export function getEnvironmentVariables() {
  return environmentVariables;
}
