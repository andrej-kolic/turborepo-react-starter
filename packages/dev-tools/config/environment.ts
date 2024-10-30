import dotenvFlow from "dotenv-flow";
// import dotenvExpand from "dotenv-expand"

// TODO: add as options parameter in getEnvVariables()
/**
 * add only variables with this prefix to import.meta.env
 */
const PREFIX = "APP_REACT";

export function getEnvVariables(envDir: string, buildEnvironment: string, bundler: string) {

  // TODO: use debug
  console.log("");
  console.log("* process.env.NODE_ENV:", process.env.NODE_ENV);
  console.log("* process.env.BUILD_ENVIRONMENT", process.env.BUILD_ENVIRONMENT);
  console.log("");

  const variables = dotenvFlow.config({
    node_env: buildEnvironment,
    default_node_env: "development",
    path: envDir,
    debug: false,
  });
  console.log("* parsed variables from .env files", typeof variables, variables.parsed);

  // const expandedVariables = dotenvExpand.expand(variables.parsed);
  // console.log('* expanded variables:', expandedVariables);

  /*
  const dotEnvMap: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(variables.parsed ?? {})) {
    // console.log(`Key: ${key}, Value: ${value}`);
    if (key.startsWith(PREFIX)) {
      dotEnvMap[key] = value;
    }
  }
  console.log("* dotenv map:", dotEnvMap);
  */

  const processEnvMap: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    // console.log(`Key: ${key}, Value: ${value}`);
    if (key.startsWith(PREFIX)) {
      processEnvMap[key] = value;
    }
  }
  console.log("* process map:", processEnvMap);

  const BUNDLER = bundler;
  const MODE = buildEnvironment;

  return {
    // ...dotEnvMap,
    ...processEnvMap,
    BUNDLER,
    MODE,
  };
}
