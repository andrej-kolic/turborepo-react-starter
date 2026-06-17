# AGENTS.md

Canonical instructions for AI agents working in this repository.

## Product overview

Frontend-only **pnpm + Turborepo** monorepo (`turborepo-react-starter`). The main product is `@repo/app-core` served by one of three bundler apps (`app-vite`, `app-webpack`, `app-esbuild`). There is no backend, database, or Docker Compose stack for local dev.

## Environment file

Root scripts use `dotenv-cli` and expect a repo-root `.env`. Copy from `.env.example` if missing. Important variables:

- `BUILD_ENVIRONMENT` — required (e.g. `staging`)
- `BUNDLER` — which app to run with `dev:app` / `build:app` (default in example: `app-vite`)

## Node.js version

`.nvmrc` specifies **Node 24** (matches CI). Prefer:

```bash
nvm use 24
```

Use `node -v` to confirm before debugging version-specific issues. **pnpm@11.1.3** is pinned via `packageManager` in root `package.json` (Corepack).

### Cursor Cloud

This VM may also expose `/exec-daemon/node` (Node 22) earlier on `PATH`. Use `nvm use 24` before debugging version-specific issues.

## `@repo/commons` build artifact

Apps import `@repo/commons` from `dist/`, which is not committed. Turbo usually builds it when you run `pnpm build`, `pnpm lint`, or `pnpm test`. If dev fails with missing `dist`, run:

```bash
pnpm --filter @repo/commons build
```

## Services (local dev)

Ports are declared as `devPort` / `previewPort` in each app's `package.json` — that is the
single source of truth. Bundler configs, `@repo/dev-tools/config/app-port`, and browser
tooling all read from it. Override the target URL with `APP_URL` only (not `PORT`).

Repo CLI helpers for port/URL resolution live in **`@repo/dev-tools`** (`dev-tools-with-app-url`, `dev-tools-print-app-port`). Root `/scripts` holds plain-Node workflow scripts only.

| Service                | Start                                         |
| ---------------------- | --------------------------------------------- |
| **app-vite** (default) | `pnpm dev:app`                                |
| app-webpack            | set `BUNDLER=app-webpack` then `pnpm dev:app` |
| app-esbuild            | set `BUNDLER=app-esbuild` then `pnpm dev:app` |
| ui-storybook           | `pnpm dev:ui`                                 |

Ports: `apps/<service>/package.json` (`devPort`, `previewPort`). For browser validation,
`pnpm browser:ensure-app` prints the resolved dev URL — agents do not need to look up ports.

To validate a production build locally, run `pnpm preview:app` (or `pnpm preview:ui` for Storybook)
and pass `--url` with the `previewUrl` from that app's `package.json` (or set `APP_URL`).

Avoid root `pnpm dev` unless you need all bundlers + Storybook + commons watch at once; it is heavy.

## Common commands

See root `README.md` and `package.json` scripts. Typical loop:

- Lint: `pnpm lint`
- Test: `pnpm test`
- Build app (current `BUNDLER`): `pnpm build:app`
- Format check: `pnpm check:format`
- Full quality gate: `pnpm quality-checks`

## Agent config (rulesync)

This repo uses [rulesync](https://github.com/dyoshikawa/rulesync) to generate tool-specific files from `.rulesync/`:

| Edit                                                          | Do not edit directly                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (canonical)                                       | —                                                                                                                           |
| `.rulesync/rules/`, `.rulesync/skills/`, `.rulesync/mcp.json` | `.cursor/rules/`, `.claude/skills/`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/mcp.json`, `.vscode/mcp.json` |

After changing `.rulesync/**`, run `pnpm sync:agents` and commit the generated outputs. CI and pre-commit run `pnpm check:agents` when agent config files change.

Skills are generated to `.claude/skills/` (Cursor, Claude Code, and Copilot all discover that path). Browser work: read the
[`browser-validation`](.claude/skills/x-browser-validation/SKILL.md) skill first.

## Browser validation

> **Read the [`browser-validation`](.claude/skills/x-browser-validation/SKILL.md) skill first** before
> doing any browser-related work. Full decision flowchart and environment scenarios are in
> [`docs/browser-validation.md`](docs/browser-validation.md).

Pick the **lightest** path that answers the question:

| Goal                                   | Tool                                                                 |
| -------------------------------------- | -------------------------------------------------------------------- |
| Logic / hooks / pure functions         | `pnpm test`                                                          |
| Component UI in isolation              | `pnpm dev:ui` → Storybook (port in `apps/ui-storybook/package.json`) |
| Assert DOM / text / evaluate JS        | browser-validation skill — follows tier A → B → C                    |
| HAR / trace / Web Vitals / CI artifact | `devtools-capture` MCP                                               |

See the **[browser-validation skill](.claude/skills/x-browser-validation/SKILL.md)** for the full decision graph (URL resolution, app startup, tier selection, CLI commands).

## Gotchas

- **MCP config:** `.rulesync/mcp.json` is the source; `pnpm sync:agents` writes `.cursor/mcp.json`
  (`mcpServers`) and `.vscode/mcp.json` (`servers`). CI validates via `pnpm check:agents`.
- **Lint** may report `no-console` warnings in app-core/ui; they are warnings, not errors.
- **Chrome capture** (`pnpm chrome:debug`, port 9222) and `packages/browser-capture` are optional; not required for SPA dev.
- **Deploy** (`pnpm deploy:aws`, `pnpm deploy:netlify`) needs cloud credentials and is out of scope for local UI work.
