# Each verify workflow ends in one required check

- Status: accepted
- Date: 2026-11-18

## Context

CI didn't match the project's structure, 3 bundlers each with a dev server and 2 builds, so the goal is one workflow each for code, commits, builds and dev servers, covering every bundler and blocking the merge when it fails.

Only `Build project` and `Build project (features)` blocked a merge; E2E, perf, dev server and commit message checks could fail and the PR still merged. The dev server check passed any server that answered HTTP 200: with `packages/app-core/src/index.tsx` broken, app-vite and app-rspack still answered 200. The rspack and esbuild production builds were never opened in a browser on a PR. Test runs and quotes: [#174's evidence comment](https://github.com/andrej-kolic/turborepo-react-starter/issues/174#issuecomment-6982314210).

## Decision

- One workflow per claim: `Verify: Code`, `Verify: Commits`, `Verify: Build`, `Verify: Dev server`. The ruleset "Protect develop and main" requires one job from each; their names and how to require them: [`docs/template/bundle-size.md`](../bundle-size.md).
- Each "All … passed" job runs after the others with `always()` and fails unless every one succeeded. GitHub counts a skipped job as passed, "even if it is a required check" ([conditions](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/using-conditions-to-control-job-execution)), so requiring the matrix jobs alone would let a skipped one through. Matrix job names can change without touching the ruleset.
- Dev servers are checked with the `@smoke` Playwright test, not HTTP 200. It failed on all 18 broken runs in #174 (3 bundlers × dev server and preview, 3 kinds of break) and passed on the working app.
- `Verify: Perf` runs weekly and by hand, not on PRs. LCP over 40 runs per bundler peaked at 892 ms against a 2500 ms budget. `Verify: Build` now opens every build in a browser, so perf is no longer the only check that does.
- The Vite dev server listens on every address (`server.host: true`), as rspack and esbuild do. Vite's default listens only on the address `localhost` resolves to first, and in CI's Playwright container the dev server check never reached it.

## Rejected

- Requiring every matrix job by name: each new bundler or profile needs a ruleset edit.
- Passing `--host` to Vite in CI only: CI would test a setup no developer runs.

## Consequences

- A failed, skipped or cancelled job blocks the merge.
- Renaming an "All … passed" job, or adding a verify workflow, needs a ruleset edit; [`docs/template/bundle-size.md`](../bundle-size.md) has the steps.
- The Vite, rspack and esbuild dev servers are reachable from the local network.
- A perf regression shows up within a week, not on the PR that caused it.
