// Sentry's release name format, package@version+build: https://docs.sentry.io/product/releases/naming-releases/
const RELEASE_PACKAGE = 'turborepo-react-starter';

/**
 * The Sentry release name `Sentry.init` sends with each error. Source maps don't need it: Sentry matches them by debug ID.
 *
 * @param version `APP_REACT_VERSION`, a semver version
 * @param commit `GIT_COMMIT`, the full commit hash; its first 7 characters go in the name
 *
 * @returns e.g. `turborepo-react-starter@0.1.6+abc1234`, or `turborepo-react-starter@0.1.6` without a commit
 */
export function sentryRelease(version: string, commit?: string): string {
  const release = `${RELEASE_PACKAGE}@${version}`;
  if (!commit) return release;
  const shortCommit = commit.slice(0, 7);
  // A version with build metadata already has its one +: semver allows only one.
  return version.includes('+')
    ? `${release}.${shortCommit}`
    : `${release}+${shortCommit}`;
}
