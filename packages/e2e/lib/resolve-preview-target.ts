import {
  resolveAppTargets,
  warnIfStaleLocalTargetUrlOverride,
  type AppTargets,
} from '@repo/dev-tools/config/app-port';

const PREVIEW_MODE = 'preview' as const;

/**
 * Resolve the E2E preview target using the same rules as `dev-tools-app-target --preview`.
 */
export function resolvePreviewAppTarget(
  env: NodeJS.ProcessEnv = process.env,
): AppTargets {
  warnIfStaleLocalTargetUrlOverride(env, PREVIEW_MODE);
  const targets = resolveAppTargets(env, PREVIEW_MODE);
  if (!targets) {
    throw new Error(
      'Set BUNDLER (e.g. app-vite) or TARGET_URL before running E2E tests against preview.',
    );
  }

  return targets;
}
