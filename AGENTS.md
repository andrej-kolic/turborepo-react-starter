# AGENTS.md

Canonical instructions for AI agents working in this repository.

## Product overview

Frontend-only **pnpm + Turborepo** monorepo (`turborepo-react-starter`). The main product is `@repo/app-core` served by one of three bundler apps (`app-vite`, `app-webpack`, `app-esbuild`). There is no backend, database, or Docker Compose stack for local dev.

## Monorepo conventions

- Scope work with `pnpm --filter <pkg> <script>`.
- Internal packages use `@repo/` prefix and `workspace:*` in `package.json`.
- Extend `@repo/typescript-config` and `@repo/eslint-config`.
- Quality loop: `pnpm lint` · `pnpm test` · `pnpm check:type` · `pnpm check:agents` · `pnpm quality-checks`

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
tooling all read from it. Override the browser/E2E target URL with **`TARGET_URL`** (ephemeral — shell, CI, or `dev-tools-app-target run`; not in committed `.env`). Do not use `PORT` for this.

Repo CLI helpers for port/URL resolution live in **`@repo/dev-tools`** (`dev-tools-app-target`). Root `/scripts` holds plain-Node workflow scripts only.

| Service                | Start                                         |
| ---------------------- | --------------------------------------------- |
| **app-vite** (default) | `pnpm dev:app`                                |
| app-webpack            | set `BUNDLER=app-webpack` then `pnpm dev:app` |
| app-esbuild            | set `BUNDLER=app-esbuild` then `pnpm dev:app` |
| ui-storybook           | `pnpm dev:ui`                                 |

Ports: `apps/<service>/package.json` (`devPort`, `previewPort`). For browser tooling,
`pnpm browser:ensure-app` prints the resolved dev URL — agents do not need to look up ports.

To validate a production build locally, run `pnpm preview:app` (or `pnpm preview:ui` for Storybook)
and pass `--url` with the `previewUrl` from that app's `package.json` (or set `TARGET_URL`).

Avoid root `pnpm dev` unless you need all bundlers + Storybook + commons watch at once; it is heavy.

## Validation map

- While developing: browser snapshot / screenshot / validate (browser-tools)
- CI regression: Playwright E2E on preview build
- Multi-bundler boot: verify-browser-smoke.yml (all bundlers)
- Debug on failure: Playwright trace (+ optional browser-capture)

E2E runs against a **production preview** build — not the dev server. Full layer breakdown: [`docs/e2e.md`](docs/e2e.md).

## Common commands

See root `README.md` and `package.json` scripts. Typical loop:

- Lint: `pnpm lint`
- Test: `pnpm test` (unit only — E2E is separate)
- E2E: `pnpm e2e` (after `pnpm build:app` + `pnpm preview:app`)
- Build app (current `BUNDLER`): `pnpm build:app`
- Format check: `pnpm check:format`
- Full quality gate: `pnpm quality-checks`

## Documentation map

| Doc                                                                                            | Purpose                                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`README.md`](README.md)                                                                       | Human-oriented package inventory and basic commands                      |
| [`.claude/skills/x-browser-validation/SKILL.md`](.claude/skills/x-browser-validation/SKILL.md) | Browser **verify** workflow — tier A → B → C (read before any DOM check) |
| [`.claude/skills/x-browser-capture/SKILL.md`](.claude/skills/x-browser-capture/SKILL.md)       | HAR, traces, Web Vitals — capture only, not routine verification         |
| [`docs/e2e.md`](docs/e2e.md)                                                                   | Playwright E2E — local run, bundler override, locators                   |
| [`docs/browser-validation.md`](docs/browser-validation.md)                                     | URL derivation, edge cases (`--attach`, remote, SSH), Storybook          |
| [`docs/component-validation-contract.md`](docs/component-validation-contract.md)               | `data-testid` naming and scope                                           |
| [`docs/design-spec-validation.md`](docs/design-spec-validation.md)                             | Agent design checks — snapshot, screenshot, `browser eval`               |

Pick the **lightest** tool for the question: `pnpm test` (logic) · `pnpm e2e` (CI regression) ·
Storybook (isolated UI) · browser-validation skill (live dev DOM/text) · browser-capture skill (artifacts).

## Agent config (rulesync)

This repo uses [rulesync](https://github.com/dyoshikawa/rulesync) to generate tool-specific files from `.rulesync/`:

| Edit                                                                                 | Do not edit directly                                                                                                                                                                           |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (canonical)                                                              | —                                                                                                                                                                                              |
| `.rulesync/rules/`, `.rulesync/skills/`, `.rulesync/commands/`, `.rulesync/mcp.json` | `.cursor/rules/`, `.cursor/commands/`, `.claude/rules/`, `.claude/skills/`, `.claude/commands/`, `.github/copilot-instructions.md`, `.github/prompts/`, `.cursor/mcp.json`, `.vscode/mcp.json` |

After changing `.rulesync/**`, run `pnpm sync:agents` and commit the generated outputs. CI and pre-commit run `pnpm check:agents` when agent config files change. Skills sync to `.claude/skills/` (discovered by Cursor, Claude Code, and Copilot). Commands sync to `.cursor/commands/`, `.claude/commands/`, and `.github/prompts/` (Copilot slash prompts).

## Gotchas

- **Lint** may report `no-console` warnings in app-core/ui; they are warnings, not errors.
- **Chrome capture** (`pnpm chrome:debug`, port 9222) and `packages/browser-capture` are optional; not required for SPA dev.
- **Deploy** (`pnpm deploy:aws`, `pnpm deploy:netlify`) needs cloud credentials and is out of scope for local UI work.
