# Use one branch, `main`: two were needlessly complex

- Status: accepted
- Date: 2026-11-25

## Context

The branching model was needlessly complex for a template (issue #224):

- `main` only repeated `develop`: its only own commits were 8 merges of it.
- A copy made from the template gets only the default branch, `develop`, unless "Include all branches" is ticked. The workflows expect both.

## Decision

- `main` is the only long-lived branch and the default one. Work branches start from it, and PRs target it.
- `develop` was merged with a merge commit, which keeps every commit's hash.

## Rejected

- Keeping `develop` as the only branch: `main` is the name GitHub gives a new repository's default branch.
- Squashing or rebasing `develop` into `main`: it rewrites the commits, and the history and contributions with them.

## Consequences

- Links and clones that use `develop` break.
- Deploys are unchanged for now: a push to `main` deploys staging, and only a manual run deploys development.
