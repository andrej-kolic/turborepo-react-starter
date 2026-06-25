# Turborepo React starter

Monorepo starter project for FE projects

## What's inside?

### Source

Most packages are 'light', meaning they only export source code without build/bundle step.
Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

#### Apps

- `app-esbuild`: ESBuild bundler for main app
- `app-vite`: Vite bundler for main app
- `app-webpack`: Webpack bundler for main app
- `ui-storybook`: Storybook as dev server for ui package

#### Packages

- `app-core`: React app developed as library
- `commons`: a stub library shared by other packages. built using tsup
- `dev-tools`: utils for development, shared by other packages. not meant to be used in source code
- `@repo/ui`: a stub React component library shared by applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo
- `browser-tools`: Chrome lifecycle + DOM verification CLI (`pnpm browser snapshot`, `pnpm browser validate`, `pnpm browser read`, …)
- `browser-capture`: DevTools artifact capture CLI (HAR, traces, Web Vitals)
- `e2e`: Playwright E2E regression tests (`pnpm e2e`) against preview builds

#### Infra

- `aws`: CloudFormation-based AWS deployment with CloudFront, S3, and ACM certificates
- `netlify`: tools and scripts used to deploy to Netlify, both locally and from CI

### Utilities

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
pnpm build
```

### Develop

Copy `.env.example` to `.env` at the repo root, then use the scoped dev scripts (preferred):

```
pnpm dev:app   # active bundler (BUNDLER in .env, default app-vite) + dependency watchers
pnpm dev:ui    # Storybook + dependency watchers
```

`pnpm dev` starts every bundler, Storybook, and package watch tasks at once — avoid it unless you need the full matrix.

### Test

**Unit tests** (Vitest) — all apps and packages:

```
pnpm test
```

**E2E** (Playwright) — browser regression on a production preview build (not the dev server):

```bash
pnpm build:app
pnpm preview:app &          # serve preview (default bundler: app-vite)
pnpm --filter @repo/e2e install:browsers   # first run only — install Chromium
pnpm e2e
```

CI runs E2E via `.github/workflows/verify-e2e.yml`. For bundler overrides, locators, and the
agent vs regression split, see [`docs/e2e.md`](docs/e2e.md).

### Lint

To lint all apps and packages, run the following command:

```
pnpm lint
```

### Debug & browser tooling

```bash
pnpm chrome:debug           # start Chrome with remote debugging (port 9222)
pnpm chrome:debug --status  # check
pnpm chrome:debug --stop    # stop
pnpm browser:setup          # ensure Chrome + open app tab (verify tier)
pnpm browser snapshot       # see DOM + data-testid regions (agent eyes, no MCP)
pnpm browser validate --selector "[data-testid=app-header]"  # DOM checks
pnpm capture record-trace --duration 3   # HAR + trace artifacts (capture tier)
```

Agent workflow, CLI flags, and package-level docs: [`AGENTS.md`](AGENTS.md) · [`packages/browser-tools/README.md`](packages/browser-tools/README.md) · [`packages/browser-capture/README.md`](packages/browser-capture/README.md).
