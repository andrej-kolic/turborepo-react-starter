# Source maps go to Sentry with `sentry-cli`, never to the host

- Status: accepted
- Date: 2026-11-15

## Context

Without source maps, Sentry shows minified stack frames (`at a (assets/index-3f9c.js:1:48211)`). The app is built by three bundlers (Vite, Rspack, esbuild with `splitting: true`) and deployed to AWS or Netlify, from CI and from a developer's machine. A fork has no Sentry account.

## Decision

- Every production build writes hidden source maps: `.map` files exist, but no JS file has a `sourceMappingURL` comment.
- Before anything is published, the deploy scripts run one script that calls `sentry-cli sourcemaps inject`, then `sentry-cli sourcemaps upload --strict`, then deletes every `.map`. Sentry matches a frame to its map by the debug ID `inject` adds, its recommended method ([debug IDs](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/troubleshooting_js/debug-ids/)).
- The deploy fails only if a `.map` is left. A failed upload warns and the deploy goes ahead, as with Sentry's bundler plugins (`@sentry/bundler-plugin-core` 5.3.0 logs an upload error and continues), so a Sentry outage can't block a deploy. `--strict` makes a map that can't be uploaded count as a failed upload; without it the upload exits 0. Without credentials (a fork) the upload is skipped with a warning; the maps are still deleted.
- Credentials are whatever `sentry-cli` itself finds, env vars or `~/.sentryclirc`. CI passes `SENTRY_AUTH_TOKEN` as a secret and `SENTRY_ORG` / `SENTRY_PROJECT` as repo variables holding slugs, the same values as `~/.sentryclirc`. Only deploy workflows get the token.
- The upload sends no release: Sentry matches each map by debug ID, and its docs say a release is no longer needed for that. So a build Turbo reuses from its cache can't disagree with its maps.
- `Sentry.init` sets the release `turborepo-react-starter@<APP_REACT_VERSION>+<short commit>`. The build reads the commit with `git rev-parse HEAD`, as Sentry's bundler plugins do, so local and CI builds get it the same way; outside a git checkout the release is `turborepo-react-starter@<APP_REACT_VERSION>`. A version that already has a `+` part gets `.<short commit>` appended to it, since two `+` is not a valid semantic version. The `package@` prefix is Sentry's format for release names ([naming releases](https://docs.sentry.io/product/releases/naming-releases/)). It only groups events; it doesn't match maps.

## Rejected

- Sentry's bundler plugins (`@sentry/vite-plugin`, `@sentry/webpack-plugin`, `@sentry/esbuild-plugin`): all three worked in a spike, but the esbuild plugin "doesn't fully support esbuild configurations with `splitting: true`" ([Sentry docs](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/esbuild/)), three plugins are three configs, and each build would need the token.
- Passing the commit in as an environment variable from CI and the deploy scripts: two places to keep in step, and plain local builds would lack it.
- Matching by release name and URL prefix: the method Sentry now calls legacy, still used by Excalidraw, Hypothesis and Insomnia.
- Failing the deploy on a failed upload: a Sentry outage would block every deploy, an urgent fix included. Stricter than Sentry's own plugins.
- A host rule that answers 404 for `.map` requests: the leftover check already guarantees no map is published, and no bucket has held one.
- Org and project IDs instead of slugs: unreadable in logs; a rename makes the upload fail either way.

## Consequences

- A deploy made while Sentry can't be reached ships with a warning, and its errors stay minified in Sentry: its maps are deleted, so they can't be uploaded later.
- Debugging a deployed build in the browser shows minified code: the maps exist only in Sentry.
