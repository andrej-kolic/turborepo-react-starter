# Every check runs on two build profiles, bare and features

- Status: accepted
- Date: 2026-11-17

## Context

Optional features are switched on by env values, such as `APP_REACT_SENTRY_DSN` ([0009](0009-optional-features-gate.md)). So the build a check saw depended on the machine: locally, `packages/web/.env.local` gave E2E a developer's real DSN, so a test sent real error events to their Sentry project; in CI no DSN was set, so no feature was E2E-tested. `pnpm check:size` dropped Sentry's limit on a build without a DSN, and `pnpm check:env-guards` checked whatever build was in `dist/`. #158 worked around this for Web Vitals with a tag `@sentry`, a script `pnpm e2e:sentry` and a CI job with a fake DSN; every new optional library would have added another of each.

## Decision

- Two builds, the same checks on each, as React's CI runs every test with its feature flags off and on ([`--variant=false` / `--variant=true`](https://github.com/facebook/react/blob/a8342585c75bebaaca5d73e3724f4744e940ec09/.github/workflows/runtime_build_and_test.yml#L229-L240)): `bare`, no optional features, and `features`, every one on with fake values. `BUILD_PROFILE` picks one. It is a second axis next to `BUILD_ENVIRONMENT`, merged by the env loader, as Android merges product flavors with build types ([build variants](https://developer.android.com/studio/build/build-variants)).
- The profile is read in `packages/dev-tools/config/environment.ts`, the loader all three bundlers share, so `pnpm --filter <app> build` gets it too. With a profile, dotenv-flow's public `config({ files })` loads `.env`, `.env.<BUILD_ENVIRONMENT>`, and `.env.features` on `features`; no `.local` file. Next.js skips `.env.local` in tests "so tests produce the same results for everyone" ([load order](https://nextjs.org/docs/app/guides/environment-variables)); skipping `.env.<env>.local` too is our choice. Shell and CI variables still win.
- Only `features` has a committed file, `packages/web/.env.features`. A unit test fails when the env schema gains an optional key that the file doesn't set, so a new feature can't go untested.
- Every check gets its build from Turbo, which caches each profile's build separately (`BUILD_PROFILE` is in `globalEnv`), after the uncached `clear:dist` task empties the app's `dist/` (a cache hit copies files in without deleting old ones, [vercel/turborepo#14837](https://github.com/vercel/turborepo/issues/14837)): `check:env-guards` became a per-app task after `build`, like `check:size`, and E2E starts `pnpm preview:app` through Playwright's [`webServer`](https://playwright.dev/docs/test-webserver), never reusing a running preview.
- Root `clear:output` depends on `clear:dist` too, so an app's own `clear:output` removes only its other folders: esbuild's `dev/`. Vite and Rspack have none.
- E2E stays out of the Turbo graph: as a Turbo task ([Turborepo's Playwright guide](https://turborepo.dev/docs/guides/tools/playwright)) it would depend on, and build, all three apps, while CI tests one ([0003](0003-e2e-on-preview-build.md)).
- Playwright has one project per profile; `bare` leaves out tests tagged `@features`. The `e2e` script in `packages/e2e/package.json` fails without `BUILD_PROFILE` and runs its project. Not in `playwright.config.ts`: knip loads that config with only `BUNDLER` set.
- CI: `Verify: Build` runs one job per bundler and profile; each builds, checks size and env guards, and runs Playwright on that build. Check workflows no longer pass the repo's DSN: an empty repo variable is `""`, which would win over `.env.features`. Deploys take no profile and keep it.

## Rejected

- A tag, script and CI job per optional library, as #158 did for Sentry: grows with every library.
- A test that skips itself unless an env flag is set: it looks covered without running (#158's first version did this).
- Loading `.env.features` with dotenv-cli before `turbo run`: it would skip `pnpm --filter <app> build`.
- Narrowing `check:env-guards` to `$BUNDLER`'s app: the script can't see `BUNDLER`. Recording the profile in `dist/`: adds code to all three bundlers.
- dotenv-flow's `listFiles()`: its README calls it internal.
- Emptying `dist/` inside each `build` script: a cache hit skips the script. Turborepo has no option for it (`clean: true` was proposed in [#10951](https://github.com/vercel/turborepo/issues/10951), not built); its team's answer is a clean task in `build`'s `dependsOn` ([discussion #3637](https://github.com/vercel/turborepo/discussions/3637)).
- `build` depending on `clear:output`: on esbuild it also deletes `dev/`, which a running dev server serves.

## Consequences

- A check gives the same result on every machine, and no check reads a developer's secrets.
- `pnpm e2e`, `check:size` and `check:env-guards` build before they check, through Turbo's cache; a cache hit puts back the profile's `dist/`, into the empty folder `clear:dist` leaves.
- Rebuilding while a preview runs removes its files until the build ends, as Vite and Rspack already did on a fresh build. A failed build leaves `dist/` empty.
- A preview of the app that is already running makes `pnpm e2e` fail; `TARGET_URL` tests a running preview without building.
- Turbo runs the preview in its own process group, so Playwright stops it with SIGTERM (`gracefulShutdown`): its default SIGKILL left the preview running (tested 2026-11-17).
- A new optional feature adds its fake values to `.env.features`; it needs no new job, script or tag.

How to use the profiles: [`docs/template/build-profiles.md`](../build-profiles.md).
