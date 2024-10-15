export interface EnvironmentVariables {
  readonly BUNDLER: string;
  readonly APP_REACT_TITLE: string;
  readonly APP_REACT_ENV_FILE: string;
};

const environmentVariables: EnvironmentVariables = {
  BUNDLER: import.meta.env.BUNDLER,
  APP_REACT_TITLE: import.meta.env.APP_REACT_TITLE,
  APP_REACT_ENV_FILE: import.meta.env.APP_REACT_ENV_FILE,
};

// TODO: include additional processing or validation if needed

export function getEnvironmentVariables() {

  return environmentVariables;
}
