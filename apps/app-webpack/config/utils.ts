import dotenvFlow from "dotenv-flow";

const PREFIX = "APP_REACT";

export function getEnvVariables(appCoreEnvDir: string) {
  const variables = dotenvFlow.config({
    default_node_env: 'development',
    path: appCoreEnvDir,
    debug: false,
  });
  console.log("* variables", typeof variables, variables.parsed);

  const dotEnvMap = new Map<string, string>();
  for (const [key, value] of Object.entries(variables.parsed ?? {})) {
    // console.log(`Key: ${key}, Value: ${value}`);
    if (key.startsWith(PREFIX)) {
      dotEnvMap.set(`import.meta.env.${key}`, JSON.stringify(value));
    }
  }
  console.log("* dotenv map:", Object.fromEntries(dotEnvMap));

  const processEnvMap = new Map<string, string>();
  for (const [key, value] of Object.entries(process.env)) {
    // console.log(`Key: ${key}, Value: ${value}`);
    if (key.startsWith(PREFIX)) {
      processEnvMap.set(`import.meta.env.${key}`, JSON.stringify(value));
    }
  }
  console.log("* process map:", Object.fromEntries(processEnvMap));

  return {
    ...Object.fromEntries(dotEnvMap),
    ...Object.fromEntries(processEnvMap),
  };
}
