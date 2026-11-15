# AWS deploys keep old `assets/` files for 7 days

- Status: accepted
- Date: 2026-11-15

## Context

The app loads some code only when it needs it, through `import()`: Sentry's, since #158. A tab opened before a deploy still asks for its own version's file names under `assets/`. The deploy used `aws s3 sync --delete`, which removed those files at once, so the old tab failed to load them.

## Decision

- [`infra/aws/scripts/deploy.sh`](../../../infra/aws/scripts/deploy.sh) leaves `assets/` out of `sync --delete`. `delete_old_assets` then deletes only the `assets/` files older than `OLD_ASSETS_DAYS` (7).
- Every deploy re-sends all current files with `aws s3 cp`, which resets their age, so only files no deploy has sent for 7 days are deleted.
- A tab whose file is gone anyway runs without Sentry: the `import()` failure is caught in `packages/app-core/src/error-reporting/index.ts`.

## Rejected

- An S3 lifecycle rule that expires `assets/` files after N days: it counts from the last upload, so with no deploy for N days it deletes the files the current site uses.
- Bucket versioning with expiry of old versions: each build gives changed files new names, so an old file is never overwritten and never becomes an old version.
- Tagging old files for a lifecycle rule to delete: the deploy still has to list them to tag them, which is the step that can delete them directly.

## Consequences

- The bucket holds up to 7 days of old builds' `assets/` files.
- A deploy fails if listing or deleting old files fails.
- Netlify deploys don't do this: the site serves only the current deploy's files, so a tab opened before a Netlify deploy runs without Sentry until it reloads. Netlify's skew protection, which keeps a tab on its first deploy, is documented only for Astro and Next.js ([Netlify docs](https://docs.netlify.com/deploy/deploy-overview)).
