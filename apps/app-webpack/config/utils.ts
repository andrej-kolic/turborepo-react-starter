import dotenvFlow from "dotenv-flow";
// import dotenvExpand from "dotenv-expand"

/**
 * import only variables with this prefix to import.meta.env
 */
const PREFIX = "APP_REACT";

export function getEnvVariables(appCoreEnvDir: string) {
  const variables = dotenvFlow.config({
    default_node_env: "development",
    path: appCoreEnvDir,
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

  const BUNDLER = "webpack";
  // const MODE

  return {
    // ...dotEnvMap,
    ...processEnvMap,
    BUNDLER,
  };
}
