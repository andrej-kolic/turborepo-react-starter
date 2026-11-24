# Build profiles

Build profiles exist only for checks: `pnpm e2e`, `pnpm check:size`, `pnpm check:env-guards`, which run on both profiles, and the `Verify: Perf` workflow, which runs on `bare` only. A profile makes a check build the app the same way on every machine and never read a developer's secrets. Before profiles, a check built whatever was in your `.env.local`: E2E sent events to your real Sentry project, and CI, which had no DSN, never tested Sentry at all. Why this design: [`decisions/0013-build-profiles.md`](decisions/0013-build-profiles.md).

`BUILD_PROFILE` names one of two builds: `bare`, with no optional features, as a fork ships it, and `features`, with every optional feature on with fake values. Running a check on both checks every feature off and on.

Neither profile sets `APP_REACT_API_URL`, so both ship the mocked todo API, `bare` included: MSW in its own file, which only todo page visitors download ([env.md](env.md#turn-code-on-when-a-value-is-unset)).

The dev server, `pnpm build:app` and deploys take no profile: they load `.env.local` and your real values, as before.

| Profile    | Env files the build loads                                                          | E2E tests              |
| ---------- | ---------------------------------------------------------------------------------- | ---------------------- |
| `bare`     | `.env`, `.env.<BUILD_ENVIRONMENT>`                                                 | all except `@features` |
| `features` | `.env`, `.env.<BUILD_ENVIRONMENT>`, `.env.features` (fake values)                  | all                    |
| none       | `.env`, `.env.local`, `.env.<BUILD_ENVIRONMENT>`, `.env.<BUILD_ENVIRONMENT>.local` | won't run              |

The files are in `packages/web/`. Shell and CI variables still win over every file.

## Run a check on a profile

Set `BUILD_PROFILE` for the one command, never in `.env`: there it would also reach `pnpm deploy:aws` and ship the fake values.

```bash
BUILD_PROFILE=features pnpm e2e               # builds BUNDLER's app, serves its preview, runs the tests
BUILD_PROFILE=features pnpm check:size        # builds every bundler app first
BUILD_PROFILE=features pnpm check:env-guards  # the same
BUILD_PROFILE=bare pnpm build:app             # or preview:app, to look at one build
```

Each check builds first through Turbo, which caches each profile's build separately. Each app empties its `dist/` before its build ([0018](decisions/0018-clear-dist-before-build.md)), so a check never runs on a leftover build of the other profile. On `features`, `check:size` and `check:env-guards` fail if Sentry's code is missing from the build. How to run E2E: [e2e.md](e2e.md).

CI runs each check once per profile: `Verify: Build` has a `Build (<bundler>, <profile>)` job for every bundler and profile, which builds, checks size and env guards, and runs Playwright on that build's preview.

## Add an optional feature

Put its fake values in [`packages/web/.env.features`](../../packages/web/.env.features), so the `features` build turns it on. `pnpm test` fails while an optional key in [`env-schema.ts`](../../packages/client-types/env-schema.ts) is missing from that file. An E2E test that needs the feature gets `{ tag: '@features' }`, as [`tests/web-vitals.spec.ts`](../../packages/e2e/tests/web-vitals.spec.ts) does.

Values in `.env.features` are committed: use fake ones that send nothing, as the Sentry DSN does (E2E tests answer every request to Sentry in the browser).
