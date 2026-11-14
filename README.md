# Turborepo React starter

Monorepo starter for frontend projects: one React app (`@repo/app-core`) served by three bundlers, with shared packages, browser tooling for agents, and Playwright E2E. Written in TypeScript (the two browser CLIs in JavaScript), built with pnpm and Turborepo, linted with oxlint and formatted with oxfmt.

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm dev:app    # app on the bundler set by BUNDLER in .env (default app-vite)
pnpm dev:ui     # Storybook for @repo/ui
```

| Task        | Command                                            |
| ----------- | -------------------------------------------------- |
| Build all   | `pnpm build`                                       |
| Unit tests  | `pnpm test`                                        |
| Lint        | `pnpm lint`                                        |
| Bundle size | `pnpm check:size`                                  |
| E2E         | see [`docs/template/e2e.md`](docs/template/e2e.md) |

`pnpm dev` starts every bundler, Storybook and all watchers at once; use it only when you need all of them.

## What's inside

Apps (`apps/`):

- `app-vite`, `app-rspack`, `app-esbuild`: the same app on three bundlers
- `ui-storybook`: Storybook for `@repo/ui`

Packages (`packages/`) export source with no build step of their own, except `commons`:

- `app-core`: the React app, developed as a library
- `ui`: stub React component library
- `commons`: stub shared library, compiled with tsdown; apps import its `dist/`, which Turbo builds first
- `client-types`: bundler-neutral types for client code (`import.meta.env`, asset imports) and the Zod schema the build validates env values against
- `dev-tools`: development helpers, not for app code
- `browser-tools`: CLI that checks the running page (`pnpm browser snapshot`, `validate`, `read`)
- `browser-capture`: CLI that records HAR files, traces and Web Vitals
- `e2e`: Playwright regression tests against preview builds
- `oxlint-config`, `typescript-config`: shared lint and TypeScript configs

Infra (`infra/`): `aws` (CloudFormation with CloudFront, S3 and ACM) and `netlify` deploy scripts.

## Browser support

Every app builds for the `browserslist` query in the root `package.json`, `baseline widely available`, which moves forward as browsers age. Edit it to change the target.

## Documentation

Docs about the starter itself live in `docs/template/`. The rest of `docs/` is free for the docs of the project you build from it.

- [`docs/template/e2e.md`](docs/template/e2e.md): run and extend the E2E tests
- [`docs/template/bundle-size.md`](docs/template/bundle-size.md): the bundle size check, how to block merges on it, and how to raise a limit
- [`docs/template/browser-validation.md`](docs/template/browser-validation.md): check the page with `--attach`, remote URLs, SSH tunnels, Storybook
- [`docs/template/design-spec-validation.md`](docs/template/design-spec-validation.md): check a component against a design
- [`docs/template/app-url.md`](docs/template/app-url.md): how tools find the app URL and ports
- [`docs/template/component-validation-contract.md`](docs/template/component-validation-contract.md): `data-testid` rules and registry
- [`docs/template/decisions/`](docs/template/decisions/): why the repo works the way it does
- [`packages/browser-tools/README.md`](packages/browser-tools/README.md), [`packages/browser-capture/README.md`](packages/browser-capture/README.md): Chrome, page-check and capture commands (`pnpm chrome:debug`, `pnpm browser`, `pnpm capture`) and their flags
- [`AGENTS.md`](AGENTS.md): instructions for AI agents
