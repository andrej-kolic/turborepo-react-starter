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
- `browser-tools`: Chrome lifecycle + DOM verification CLI (`pnpm browser:validate`, `pnpm browser:read`)
- `browser-capture`: DevTools artifact capture CLI (HAR, traces, Web Vitals)

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

To develop all apps and packages, run the following command:

```
pnpm dev
```

### Test

To test all apps and packages, run the following command:

```
pnpm test
```

### Lint

To lint all apps and packages, run the following command:

```
pnpm lint
```

### Debug & browser tooling

Start Chrome with remote debugging (required for browser CLI and MCP tools):

```bash
pnpm chrome:debug          # start (port 9222)
pnpm chrome:debug:status   # check
pnpm chrome:debug:stop     # stop
```

**Canonical agent docs:** [`AGENTS.md`](AGENTS.md) — setup, ports, commands, and browser-validation overview.

Two packages — do not mix verify and capture:

- **`packages/browser-tools`** (verify) — DOM assertions over CDP; no artifacts.
  - `pnpm browser:validate --url <url> --selector <css> [--contains <text>]`
  - `pnpm browser:read --url <url> --selector <css> [--json]`
  - **Docs:** `packages/browser-tools/README.md`, [`docs/browser-validation.md`](docs/browser-validation.md)

- **`packages/browser-capture`** (capture) — HAR, traces, performance, console, interactions.
  - **Local:** `pnpm chrome:debug` then `node packages/browser-capture/bin/copilot-devtools.js <command>`
  - **Commands:** `capture-snapshot`, `record-trace`, `record-performance`, `record-console`, `record-interactions`, `upload-artifacts`, `mcp-server`
  - **Docs:** `packages/browser-capture/README.md`, `.cursor/skills/browser-capture/SKILL.md`
  - **CI:** `.github/workflows/devtools.yml` — `/capture-trace` PR comment runs a headless `capture-snapshot` health check (not a full trace)
