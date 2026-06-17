# AGENTS.md

Canonical instructions for AI agents working in this repository. Keep `CLAUDE.md` and
`.github/copilot-instructions.md` as thin pointers — do not duplicate this file there.

## Product overview

Frontend-only **pnpm + Turborepo** monorepo (`turborepo-react-starter`). The main product is
`@repo/app-core` served by one of three bundler apps (`app-vite`, `app-webpack`, `app-esbuild`).
There is no backend, database, or Docker Compose stack for local dev.

## Monorepo conventions

- **Package manager:** pnpm + Turborepo — scope work with `pnpm --filter <pkg> <script>`.
- **App bundler:** root `dev:app` / `build:app` use `BUNDLER` from `.env` (`app-vite` default).
- **Internal packages:** `@repo/` prefix; `workspace:*` in `package.json`.
- **TypeScript / ESLint:** extend `@repo/typescript-config` and `@repo/eslint-config`.
- **Quality loop:** `pnpm lint` · `pnpm test` · `pnpm check:type` · `pnpm quality-checks`.
- **Project skills:** `.claude/skills/x-*/` (`x-` prefix = repo-owned; valid for Copilot CLI).

## When editing…

| Area                                        | Read first                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| TSX in `packages/app-core` or `packages/ui` | [`docs/component-validation-contract.md`](docs/component-validation-contract.md)               |
| Browser verify (DOM, selectors, CLI)        | [`.claude/skills/x-browser-validation/SKILL.md`](.claude/skills/x-browser-validation/SKILL.md) |
| Browser edge cases, Storybook URLs          | [`docs/browser-validation.md`](docs/browser-validation.md)                                     |
| Capture (HAR, traces, Web Vitals)           | [`.claude/skills/x-browser-capture/SKILL.md`](.claude/skills/x-browser-capture/SKILL.md)       |
| Browser CLI flags                           | [`packages/browser-tools/README.md`](packages/browser-tools/README.md)                         |
| Capture CLI / MCP reference                 | [`packages/browser-capture/README.md`](packages/browser-capture/README.md)                     |
| AWS infra (`infra/aws/`)                    | [`infra/aws/.github/copilot-instructions.md`](infra/aws/.github/copilot-instructions.md)       |

## Environment file

Root scripts use `dotenv-cli` and expect a repo-root `.env`. Copy from `.env.example` if missing:

- `BUILD_ENVIRONMENT` — required (e.g. `staging`)
- `BUNDLER` — which app for `dev:app` / `build:app` (default in example: `app-vite`)

## Node.js version

`.nvmrc` specifies **Node 24** (matches CI). Prefer `nvm use 24` before debugging version issues.
**pnpm@11.1.3** is pinned via `packageManager` in root `package.json` (Corepack).

### Cursor Cloud

This VM may expose `/exec-daemon/node` (Node 22) earlier on `PATH`. Use `nvm use 24`.

## `@repo/commons` build artifact

Apps import `@repo/commons` from `dist/`, which is not committed. Turbo usually builds it on
`pnpm build`, `pnpm lint`, or `pnpm test`. If dev fails with missing `dist`:

```bash
pnpm --filter @repo/commons build
```

## Services (local dev)

Ports are in each app's `package.json` (`devPort`, `previewPort`) — single source of truth.
Bundler configs, `@repo/dev-tools/config/app-port`, and browser tooling read from it. Override
with `APP_URL` only (not `PORT`).

Port/URL helpers: **`@repo/dev-tools`** (`dev-tools-with-app-url`, `dev-tools-print-app-port`).
Root `/scripts` holds plain-Node workflow scripts only.

| Service                | Start                                         |
| ---------------------- | --------------------------------------------- |
| **app-vite** (default) | `pnpm dev:app`                                |
| app-webpack            | set `BUNDLER=app-webpack` then `pnpm dev:app` |
| app-esbuild            | set `BUNDLER=app-esbuild` then `pnpm dev:app` |
| ui-storybook           | `pnpm dev:ui`                                 |

`pnpm browser:ensure-app` prints the resolved dev URL. For preview builds: `pnpm preview:app` or
`pnpm preview:ui` with that app's `previewUrl` (or set `APP_URL`).

Avoid root `pnpm dev` unless you need all bundlers + Storybook + commons watch at once.

## Common commands

See root `README.md` and `package.json` scripts. Typical loop:

- Lint: `pnpm lint`
- Test: `pnpm test`
- Build app (current `BUNDLER`): `pnpm build:app`
- Format check: `pnpm check:format`
- Full quality gate: `pnpm quality-checks`

## Browser work

Read [x-browser-validation](.claude/skills/x-browser-validation/SKILL.md) before any browser task.
**Verify** and **capture** are separate tiers — never mix them:

| Tier    | Package / tool                                  | Use for                                     |
| ------- | ----------------------------------------------- | ------------------------------------------- |
| Verify  | `@repo/browser-tools`, `chrome-devtools` MCP    | DOM assertions, `browser eval`, screenshots |
| Capture | `@repo/browser-capture`, `devtools-capture` MCP | HAR, traces, Web Vitals, console artifacts  |

Pick the lightest path: `pnpm test` → Storybook (`pnpm dev:ui`) → browser skill tiers A/B/C → capture MCP.

`chrome:*` and `browser:setup` need sandbox `required_permissions: ["all"]` in Cursor; regular
`pnpm browser validate` / `read` / `eval` use localhost CDP and do not.

## Gotchas

- **MCP config:** `.cursor/mcp.json` and `.vscode/mcp.json` must stay identical —
  `pnpm check:mcp-config` (also in `quality-checks` and pre-commit when either changes).
- **Lint:** `no-console` warnings in app-core/ui are warnings, not errors.
- **Chrome capture** (`pnpm chrome:debug`, port 9222) is optional for SPA dev.
- **Deploy** (`pnpm deploy:aws`, `pnpm deploy:netlify`) needs cloud credentials; out of scope for local UI work.
