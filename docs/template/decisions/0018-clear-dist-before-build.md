# Each app empties its `dist/` before its build

- Status: accepted
- Date: 2026-11-23

## Context

A Turbo cache hit copies the cached files into `dist/` without deleting the files already there. Turborepo's team calls this expected and has no setting for it: a `clean: true` task option was proposed and not built ([#10951](https://github.com/vercel/turborepo/issues/10951)). Nx deletes each output before it restores one (`copyFilesFromCache` in `packages/nx/src/tasks-runner/cache.ts`).

Build profiles ([0013](0013-build-profiles.md)) made it common: a `bare` build after a `features` build, both cache hits, left both builds' files in `apps/web-vite/dist` (2 `index-*.js`). One profile is enough to hit it: build, change the code, build, revert, and the hit puts the old files on top of the new ones. Vite and Rspack empty `dist/` themselves only when the build runs; esbuild never does.

## Decision

- Each app has an uncached `clear:dist` task (`rm -rf ./dist`), and its `build` depends on it (`apps/web-*/turbo.json`), as Turborepo's team answered in [discussion #3637](https://github.com/vercel/turborepo/discussions/3637). Turbo runs it before it restores a hit or runs the build.
- Root `clear:output` depends on `clear:dist` too, so an app's own `clear:output` removes only its other folders: esbuild's `dev/`. Vite and Rspack have none.

Checked on 2026-11-23 with turbo 2.11.11: after cache-hit builds of `features` then `bare`, each app's `dist/` holds the same files as a clean `bare` build.

## Rejected

- Emptying `dist/` inside each `build` script: a cache hit skips the script.
- `build` depending on `clear:output`: on esbuild it also deletes `dev/`, which a running dev server serves.
- A separate `dist/` per profile: the one-profile case above still leaves old files.

## Consequences

- Rebuilding while a preview runs removes its files until the build ends, as Vite and Rspack already did on a fresh build. A failed build leaves `dist/` empty.
- `pnpm --filter web-vite clear:output` (and Rspack's) is a missing script; use root `pnpm clear:output`.
- A new app adds a `clear:dist` script and the same `dependsOn` in its `turbo.json`.
