export interface EnvironmentVariables {
  // set by bundler
  readonly BUNDLER: string;
  readonly MODE: string;

  // client
  readonly APP_REACT_ENV_FILE: string;
  readonly APP_REACT_TITLE: string;
}

const environmentVariables: EnvironmentVariables = {
  BUNDLER: import.meta.env.BUNDLER,
  MODE: import.meta.env.MODE,

  APP_REACT_ENV_FILE: import.meta.env.APP_REACT_ENV_FILE,
  APP_REACT_TITLE: import.meta.env.APP_REACT_TITLE,
};

export function getEnvironmentVariables() {
  return environmentVariables;
}

// export const BUNDLER = import.meta.env.BUNDLER;
// export const MODE = import.meta.env.MODE;

// export const APP_REACT_ENV_FILE = import.meta.env.APP_REACT_ENV_FILE;
// export const APP_REACT_TITLE = import.meta.env.APP_REACT_TITLE;

// TODO: include additional processing or validation if needed
