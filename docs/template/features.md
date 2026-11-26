# Features

What the starter does for you, grouped by job. The README's [Why this starter](../../README.md#why-this-starter) picks the highlights.

## Build the app

- **Type-safe React** with React 19 and TypeScript 7 in strict mode
- **Type-safe routing** with TanStack Router: file-based routes, checked links, each page loads on demand: [guide](routing.md)
- **State management** with Zustand
- **Validation** with Zod: API replies at runtime, env values when the build starts: [guide](env.md)
- **Mocked API** with MSW, so the app runs without a backend: [guide](env.md#the-mocked-api)

## Share code across bundlers and clients

- **One app, three bundlers**: Vite, Rspack and esbuild, each with a dev and a preview server: [why](decisions/0006-bundler-independent-app.md)
- **Shared business logic** in `@repo/core`, reusable by mobile, CLI or MCP clients: [guide](core.md)
- **Component library** with Storybook, published to GitHub Pages
- **Monorepo** with pnpm and Turborepo: cached tasks, most packages used straight from source

## Work with coding agents

- **Browser checks** with `pnpm browser`: agents read and check the running app, local or deployed, signed in or not, with or without MCP: [guide](browser-validation.md)
- **Design checks**: a component compared with its design spec: [guide](design-spec-validation.md)
- **Browser capture**: network logs, traces and Web Vitals, recorded clicks turned into a Playwright test, secrets removed: [README](../../packages/browser-capture/README.md)
- **Shared agent setup** with rulesync: one source of rules, skills and commands for Claude Code and Cursor

## Test it

- **Unit testing** with Vitest and Testing Library
- **End-to-end testing** with Playwright, on every bundler's production build: [guide](e2e.md)
- **Bundle size limits** with size-limit, per bundler: [guide](bundle-size.md)
- **Performance budget**: a weekly check fails when the home page loads slower than 2.5 s on any bundler
- **CI on every pull request** with GitHub Actions: lint, types, tests, builds and dev servers on every bundler

## Ship and monitor it

- **Deploy to AWS or Netlify**, from GitHub or your machine; AWS set up as code; deploys sign in with GitHub OIDC, not stored AWS keys: [guide](deploy.md)
- **Safe deploys** on AWS: tabs opened before a deploy keep working, and no visitor gets a stale site
- **Error monitoring** with Sentry: readable stack traces, private source maps, no visitor IP addresses: [guide](error-reporting.md)
- **Performance monitoring** with Sentry: Web Vitals grouped by route
- **Opt-in features**: Sentry error reporting and an MSW mocked API, with zero bundle cost until configured: [guide](build-profiles.md)

## Keep the repo healthy

- **Linting and formatting** with oxlint and oxfmt, run before each commit; commit messages checked with commitlint
- **Unused code detection** with Knip: files, dependencies and exports
- **Dependency updates** with Dependabot: weekly, exact versions, one version of each dependency across packages: [guide](dependency-updates.md)
- **Documented decisions**: how-to guides and [decision records](decisions/) on why the repo works this way
