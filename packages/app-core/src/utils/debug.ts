import { getEnvironmentVariables } from './environment';

export function debugLog() {
  // console.log("* process.env:", process.env);
  // console.log("* process.env.APP_REACT_TITLE:", process.env.APP_REACT_TITLE);
  // console.log("* process.env.HOME:", process.env.HOME);

  // console.log("* import.meta:", import.meta);
  console.log('* import.meta.env:', import.meta.env);
  console.log('* getEnvironmentVariables():', getEnvironmentVariables());

  console.log(
    '* import.meta.env.BUILD_ENVIRONMENT:',
    import.meta.env.BUILD_ENVIRONMENT,
  );
  console.log('* import.meta.env.BUNDLER:', import.meta.env.BUNDLER);
  console.log('* import.meta.env.MODE:', import.meta.env.MODE);
  console.log(
    '* import.meta.env.APP_REACT_TITLE:',
    import.meta.env.APP_REACT_TITLE,
  );
  console.log(
    '* import.meta.env.APP_REACT_ENV_FILE:',
    import.meta.env.APP_REACT_ENV_FILE,
  );
}
