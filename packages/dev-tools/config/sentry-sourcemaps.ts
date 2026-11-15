import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { SentryCli } from '@sentry/cli';

type ConfigStatus = {
  config: { org: string | null; project: string | null };
  auth: { type: string | null };
};

function findSourceMaps(distDir: string) {
  return readdirSync(distDir, { recursive: true, encoding: 'utf8' }).filter(
    (file) => file.endsWith('.map'),
  );
}

/** Names of the credentials `sentry-cli` can't find, in env vars or `~/.sentryclirc`. */
function missingCredentials(sentryCli: string) {
  const result = spawnSync(sentryCli, ['info', '--config-status-json'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `sentry-cli info failed (exit ${result.status}): ${result.stderr}`,
    );
  }
  const { config, auth } = JSON.parse(result.stdout) as ConfigStatus;
  return [
    !auth.type && 'SENTRY_AUTH_TOKEN',
    !config.org && 'SENTRY_ORG',
    !config.project && 'SENTRY_PROJECT',
  ].filter((name) => name !== false);
}

function upload(sentryCli: string, distDir: string) {
  const missing = missingCredentials(sentryCli);
  if (missing.length > 0) {
    console.warn(
      `⚠ Sentry source map upload skipped: ${missing.join(', ')} not set. See docs/template/error-reporting.md.`,
    );
    return true;
  }
  const run = (args: string[]) =>
    spawnSync(sentryCli, args, { stdio: 'inherit' }).status === 0;
  // No --release: Sentry matches each map to its file by the debug ID inject writes into both.
  // Without --strict, a map that can't be uploaded still exits 0.
  return (
    run(['sourcemaps', 'inject', distDir]) &&
    run(['sourcemaps', 'upload', '--strict', distDir])
  );
}

/**
 * Uploads the build's source maps to Sentry, then deletes every `.map` in `distDir`, so none is published.
 * Without Sentry credentials (a fork) it skips the upload with a warning and still deletes the maps.
 * Why `sentry-cli` and not the bundler plugins: docs/template/decisions/0011-source-maps-with-sentry-cli.md
 *
 * @param distDir the build output to deploy
 *
 * A failed upload only warns, as Sentry's bundler plugins do, so a Sentry outage can't block a deploy.
 *
 * @returns false if a `.map` is left, so the deploy must stop
 */
export function uploadSourceMaps({
  distDir,
  sentryCli = SentryCli.getPath(),
}: {
  distDir: string;
  sentryCli?: string;
}) {
  let uploaded = false;
  try {
    uploaded = upload(sentryCli, distDir);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  } finally {
    for (const file of findSourceMaps(distDir)) {
      // A map that can't be deleted is reported by the leftover check below.
      try {
        rmSync(join(distDir, file));
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
      }
    }
  }

  if (!uploaded) {
    console.warn(
      `⚠ Sentry source map upload failed for ${distDir}: this deploy's errors stay minified in Sentry.`,
    );
  }
  const leftover = findSourceMaps(distDir);
  if (leftover.length > 0) {
    console.error(`✖ Source maps left in ${distDir}: ${leftover.join(', ')}.`);
  }
  return leftover.length === 0;
}
