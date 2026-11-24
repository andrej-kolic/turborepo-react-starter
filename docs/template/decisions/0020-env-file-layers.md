# Env files load in layers, with one only the dev server reads

- Status: accepted
- Date: 2026-11-24

## Context

No env file could give the dev server a value that builds don't get (issue #206). The loader picked files by stage only, and Vite runs with `--mode ${BUILD_ENVIRONMENT}`, so the dev server read the same files as a build of that stage. A dev-server default such as the mock switch (issue #207) could only go in the `dev:app` command, where `.env.local` can't turn it off: a value from the command beats every file. `.env.development` can't be the dev server's file either: it is the `development` stage's file, which pull-request CI builds read.

## Decision

- Config is a stack of layers, and a later one beats an earlier one, as Spring Boot profiles and Angular's `--configuration staging,french` work ([Spring Boot](https://docs.spring.io/spring-boot/reference/features/external-config.html), [Angular](https://angular.dev/reference/configs/workspace-config)): `.env`, `.env.<BUILD_ENVIRONMENT>`, `.env.dev-server` in the dev server, `.env.features` on the `features` profile. A value exported in the shell or CI beats every file.
- Each file has a `.local` twin, loaded right after it, never committed; a run with `BUILD_PROFILE` set skips every twin. The loader always passes the list to dotenv-flow as `files`.
- Without a profile, the twin is the only file that loads after `.env.dev-server`, so it is the one place to change a dev-server default on your machine. Loading every `.local` file last instead (the Next.js order) would let an override meant for the dev server reach local builds and laptop deploys, the leak [Excalidraw's `.env.production`](https://github.com/excalidraw/excalidraw/blob/master/.env.production) works around.
- Each bundler tells the loader whether it runs the dev server: Vite from `command === 'serve' && !isPreview` (`vite preview` also runs as `serve`), Rspack from `env.RSPACK_SERVE` (its CLI sets it only for `rspack serve`), esbuild from which config file runs.
- One switch, `BUILD_ENVIRONMENT`, still picks the stage, and `MODE` stays equal to it on all three bundlers. `PROD` already tells the dev server from a build ([0008](0008-prod-follows-node-env.md)). `--mode` doesn't change Vite's behaviour: production follows `NODE_ENV`, and `envDir: false` stops Vite loading `.env.<mode>` itself.

## Rejected

- Each stage's values as variables on its GitHub Environment (the Vercel and Expo way): every value would be set separately, and there is no switch on your laptop.
- `.env.serve`, Nx's name: `serve` is also the program the Rspack and esbuild previews run. `.env.dev` reads like a stage, and `.env.development` is a stage's file.
- Renaming `BUILD_ENVIRONMENT` to `STAGE`: it is already in `import.meta.env`, the env schema, `turbo.json` and every workflow.
- Dropping `--mode`: `MODE` would only copy the opposite of `PROD` instead of the stage.
- Renaming the `development` stage to `preview`: Netlify and Cloudflare use that name for one short-lived site per pull request, and ours is one shared site.

## Consequences

- A dev-server default goes in `packages/web/.env.dev-server`, and you change it on your machine in `.env.dev-server.local`.
- A deploy from your laptop reads `.local` files, like a local build. Downloading the stage's values from GitHub instead (`gh variable list --env <stage>`) can come later.
- One build can't move unchanged from staging to production: that would need config loaded at runtime.
- Which file loads where: [env.md](../env.md#which-env-files-load).
