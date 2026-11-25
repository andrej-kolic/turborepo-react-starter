# The app runs on three bundlers

- Status: accepted
- Date: 2026-11-12

## Context

Bundlers change faster than apps: Vite 8 moved to Rolldown, and teams move between webpack, Rspack and Vite. An app tied to one bundler's features has to be rewritten to move. This starter exists to show an app that is not tied to one.

## Decision

`@repo/web` stays bundler-neutral and runs unchanged on `web-vite`, `web-rspack` and `web-esbuild`. Bundler-specific code lives only in each app: its config, HTML page and entry file; shared client types live in `@repo/client-types`.

## Consequences

- Moving the app to another bundler means writing a new app shell, not changing `web`.
- Every new build plugin (CSS, router codegen, i18n) must work on all three bundlers. Check that before adopting one; esbuild has the fewest plugins.
- CI opens all three dev servers in a browser in `verify-dev.yml`, and all three production builds in `verify-build.yml`.
