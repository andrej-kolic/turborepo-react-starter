import { resolveAppUrl, warnIfStaleLocalTargetUrlOverride } from './app-port';

export type RunChildEnvOptions = {
  warn?: (message: string) => void;
};

/**
 * Build child process env for `dev-tools-app-target run`.
 * Passes through an existing TARGET_URL; otherwise injects dev default from BUNDLER.
 */
export function resolveRunChildEnv(
  parentEnv: NodeJS.ProcessEnv = process.env,
  options: RunChildEnvOptions = {},
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...parentEnv };

  if (env.TARGET_URL) {
    warnIfStaleLocalTargetUrlOverride(parentEnv, 'dev', options.warn);
  } else {
    const appUrl = resolveAppUrl(parentEnv);
    if (appUrl) {
      env.TARGET_URL = appUrl;
    }
  }

  return env;
}
