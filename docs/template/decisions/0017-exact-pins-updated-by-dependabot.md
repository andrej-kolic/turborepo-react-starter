# Exact dependency versions, updated weekly by Dependabot

- Status: accepted
- Date: 2026-11-20

## Context

Every npm dependency is pinned to an exact version, with no `^` or `~`, in each `package.json` and in the `pnpm-workspace.yaml` catalog. Dependabot updated only GitHub Actions, so the pins moved only when someone bumped them by hand: on 2026-11-20, 19 packages had minor or patch updates waiting.

## Decision

- Pins stay exact. This is an app and internal `workspace:*` packages, never published, so no consumer has to share our versions. A `package.json` shows the version installed, and every upgrade is a diff in a PR.
- Dependabot opens the update PRs: one `npm` entry in `.github/dependabot.yml`, weekly.
  - The entry is at `/`. Dependabot reads `pnpm-workspace.yaml` from there and updates every workspace package, the catalog and the root `pnpm-lock.yaml`. Entries per package leave the lockfile out ([dependabot-core #11135](https://github.com/dependabot/dependabot-core/issues/11135)) and are refused when a root entry exists ([dependabot-core #11487](https://github.com/dependabot/dependabot-core/pull/11487)).
  - Minor and patch updates come as one grouped PR; each major comes alone, as it may need code changes.
  - `cooldown` is 3 days: a release is proposed once it is 3 days old. pnpm itself refuses releases under 1 day old (`minimumReleaseAge`, default since [pnpm 11](https://pnpm.io/blog/releases/11.0)), so a proposed version always installs.
- Dependabot security updates are on. They skip the cooldown and the schedule ([options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)).
- Dependabot reads the pnpm 12 lockfile: its first grouped PR, [PR #198](https://github.com/andrej-kolic/turborepo-react-starter/pull/198), passed every check.

## Rejected

- Ranges (`^`): the installed version is then only in the lockfile, and an upgrade can arrive without a reviewed change.
- Renovate: a second tool next to Dependabot, which already updates GitHub Actions here and supports pnpm catalogs ([changelog](https://github.blog/changelog/2025-02-04-dependabot-now-supports-pnpm-workspace-catalogs-ga/)).

## Consequences

- An update waits for a merged PR; nothing merges by itself.
- Dependabot's updater runs its own Node, which sets the `engines` floor ([0016](0016-node-engines-floor.md)).
- A security fix under 1 day old fails its PR's install, through pnpm's `minimumReleaseAge`, until the fix is a day old.
- Security updates are a repository setting, not a file: a repository made from this template turns them on itself.

How to work with the updates: [`docs/template/dependency-updates.md`](../dependency-updates.md).
