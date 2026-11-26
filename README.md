# Turborepo React starter

A monorepo starter for a React app with multi-bundler support, agent tooling, ready-made stack, integrated toolchain and deployment setup.

## Why this starter

Everything below works out of the box.

- **Bundler-independent app**\
  One app in `@repo/web`, wrapped by Vite, Rspack and esbuild. [Why](docs/template/decisions/0006-bundler-independent-app.md)
- **Built for coding agents**\
  Eyes on the running app in any environment: local, cloud, SSH or headless, with or without MCP; rules, skills and tools shared across agents. [Guide](.claude/skills/x-browser-validation/SKILL.md)
- **Ready-made stack**\
  React 19, TanStack Router, Zustand, Zod, MSW for a mocked API, Sentry. [What's inside](#whats-inside)
- **Shared business logic**\
  API calls, models and stores in `@repo/core`, reusable by mobile, CLI or MCP clients. [Guide](docs/template/core.md)
- **Web UI library**\
  Components and design tokens in `@repo/ui`, developed in Storybook and published to GitHub Pages. [Storybook](apps/ui-storybook)
- **Integrated toolchain**\
  pnpm and Turborepo with caching, TypeScript 7, oxlint and oxfmt, Vitest, Playwright, dev and preview servers for every bundler, commit hooks with commitlint, Knip and Dependabot.
- **Type-safe validation**\
  Zod-validated API, models and env; type-checked routes. [Env](docs/template/env.md) · [Routing](docs/template/routing.md)
- **Opt-in features**\
  Sentry error reporting and an MSW mocked API, with zero bundle cost until configured. [Sentry](docs/template/error-reporting.md) · [Mock](docs/template/env.md#the-mocked-api)
- **CI quality gates**\
  E2E tests, bundle size limits and dev server checks on every bundler; weekly performance check. [E2E](docs/template/e2e.md) · [Size](docs/template/bundle-size.md)
- **AWS and Netlify deployment**\
  AWS (CloudFront, S3, HTTPS) and Netlify, deployed from GitHub or your machine. [Guide](docs/template/deploy.md)

The full list, grouped by job: [all features](docs/template/features.md).

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm dev:app    # app on the bundler set by BUNDLER in .env (default web-vite)
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

- `web-vite`, `web-rspack`, `web-esbuild`: the same app on three bundlers
- `ui-storybook`: Storybook for `@repo/ui`

Packages (`packages/`) export source with no build step of their own, except `commons`:

- `web`: the React app, developed as a library
- `core`: logic every client shares (todo API, models, settings store, mocked API), with no React, DOM or Node APIs: [add a feature](docs/template/core.md)
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

- [`docs/template/features.md`](docs/template/features.md): everything the starter does for you
- [`docs/template/e2e.md`](docs/template/e2e.md): run and extend the E2E tests
- [`docs/template/bundle-size.md`](docs/template/bundle-size.md): the bundle size check, how to block merges on it, and how to raise a limit
- [`docs/template/error-reporting.md`](docs/template/error-reporting.md): turn on Sentry error reporting
- [`docs/template/browser-validation.md`](docs/template/browser-validation.md): check the page with `--attach`, remote URLs, SSH tunnels, Storybook
- [`docs/template/design-spec-validation.md`](docs/template/design-spec-validation.md): check a component against a design
- [`docs/template/app-url.md`](docs/template/app-url.md): how tools find the app URL and ports
- [`docs/template/component-validation-contract.md`](docs/template/component-validation-contract.md): `data-testid` rules and registry
- [`docs/template/decisions/`](docs/template/decisions/): why the repo works the way it does
- [`packages/browser-tools/README.md`](packages/browser-tools/README.md), [`packages/browser-capture/README.md`](packages/browser-capture/README.md): Chrome, page-check and capture commands (`pnpm chrome:debug`, `pnpm browser`, `pnpm capture`) and their flags
- [`AGENTS.md`](AGENTS.md): instructions for AI agents

## Contributing

Issues and pull requests are welcome: see [`CONTRIBUTING.md`](CONTRIBUTING.md). Report security problems as described in [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE), except `infra/aws`, which is based on an AWS sample and stays under [Apache-2.0](infra/aws/LICENSE).

In a project you build from this starter, add your own copyright line to `LICENSE` (MIT requires keeping the existing one), and replace the contact in `CODE_OF_CONDUCT.md` and the link in `SECURITY.md`.
