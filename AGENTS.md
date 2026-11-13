# AGENTS.md

Canonical instructions for AI agents working in this repository.

## Product overview

Frontend-only **pnpm + Turborepo** monorepo (`turborepo-react-starter`). The main product is `@repo/app-core` served by one of three bundler apps (`app-vite`, `app-rspack`, `app-esbuild`). There is no backend, database, or Docker Compose stack for local dev.

## Monorepo conventions

- Scope work with `pnpm --filter <pkg> <script>`.
- Internal packages use `@repo/` prefix and `workspace:*` in `package.json`.
- Extend `@repo/typescript-config` and `@repo/oxlint-config`.
- Quality loop: `pnpm lint` · `pnpm test` · `pnpm check:type` · `pnpm check:unused` · `pnpm check:agents` · `pnpm quality-checks`
- Commit messages and PR titles: Conventional Commits, subject starts lowercase, header at most 72 characters (aim for 50). Enforced by the `commit-msg` hook and the `Verify: Commits` workflow (PRs, and pushes to `develop`/`main`); rules in `commitlint.config.js`.

## Environment file

Root scripts use `dotenv-cli` and expect a repo-root `.env`. Copy from `.env.example` if missing. Important variables:

- `BUILD_ENVIRONMENT` — required (e.g. `staging`)
- `BUNDLER` — which app to run with `dev:app` / `build:app` (default in `.env.example`: `app-vite`)

## Node.js version

`.nvmrc` specifies **Node 26** (matches CI). Prefer:

```bash
nvm use 26
```

Use `node -v` to confirm before debugging version-specific issues. **pnpm** is pinned via `packageManager` in root `package.json`.

### Cursor Cloud

This VM may also expose `/exec-daemon/node` (Node 22) earlier on `PATH`. Use `nvm use 26` before debugging version-specific issues.

## `@repo/commons` build artifact

`@repo/commons` is a compiled package on purpose: apps import it from `dist/`, which is not committed. Every Turbo task (`pnpm dev:app`, `pnpm build`, `pnpm lint`, `pnpm test`) builds it first. Running an app's script without Turbo (e.g. `pnpm --filter app-vite dev`) skips that build; if it fails with `Can't resolve '@repo/commons'`, run:

```bash
pnpm --filter @repo/commons build
```

## Services (local dev)

Override the browser or E2E target URL with **`TARGET_URL`**, never `PORT`, and never put it in `.env`. Ports, URL resolution and the stale-`TARGET_URL` trap: [`docs/app-url.md`](docs/app-url.md).

Repo CLI helpers for port/URL resolution live in **`@repo/dev-tools`** (`dev-tools-app-target`). Root `/scripts` holds plain-Node workflow scripts only.

| Service                  | Start                                                                          |
| ------------------------ | ------------------------------------------------------------------------------ |
| **app** (active bundler) | `pnpm dev:app` — `BUNDLER` in `.env` (`app-vite`, `app-rspack`, `app-esbuild`) |
| ui-storybook             | `pnpm dev:ui`                                                                  |

`pnpm browser:ensure-app` prints the resolved dev URL, so agents do not need to look up ports.

To validate a production build locally, run `pnpm preview:app` (or `pnpm preview:ui` for Storybook)
and pass `--url` with the `previewUrl` from that app's `package.json` (or set `TARGET_URL`).

Avoid root `pnpm dev` unless you need all bundlers + Storybook + commons watch at once; it is heavy.

## Validation map

- While developing: browser snapshot / screenshot / validate (browser-tools)
- CI regression: Playwright E2E on preview build (`DEFAULT_BUNDLER` in CI; `BUNDLER` in `.env` locally)
- Multi-bundler boot: verify-browser-smoke.yml (dev server HTTP 200, all bundlers)
- Debug on failure: Playwright trace (+ optional browser-capture)

E2E runs against a **production preview** build — not the dev server. How to run it: [`docs/e2e.md`](docs/e2e.md); why: [`docs/decisions/0003-e2e-on-preview-build.md`](docs/decisions/0003-e2e-on-preview-build.md).

## Common commands

See root `README.md` and `package.json` scripts. Typical loop:

- Lint: `pnpm lint`
- Test: `pnpm test` (unit only — E2E is separate)
- E2E: `pnpm e2e` (after `pnpm build:app` + `pnpm preview:app`)
- Build app (current `BUNDLER`): `pnpm build:app`
- Format check: `pnpm check:format`
- Unused files, dependencies and exports (knip): `pnpm check:unused`
- Full quality gate: `pnpm quality-checks`
- Modern web platform guidance (run on request only, telemetry off): `pnpm modern-web-guidance legacy-scan .` · `search "<topic>"` · `retrieve <id>`

## Documentation map

| Doc                                                                                            | Purpose                                                                  |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`README.md`](README.md)                                                                       | Human-oriented package inventory and basic commands                      |
| [`.claude/skills/x-browser-validation/SKILL.md`](.claude/skills/x-browser-validation/SKILL.md) | Browser **verify** workflow — tier A → B → C (read before any DOM check) |
| [`.claude/skills/x-browser-capture/SKILL.md`](.claude/skills/x-browser-capture/SKILL.md)       | HAR, traces, Web Vitals — capture only, not routine verification         |
| [`docs/e2e.md`](docs/e2e.md)                                                                   | Playwright E2E: run locally, other bundler, add a test                   |
| [`docs/browser-validation.md`](docs/browser-validation.md)                                     | Special setups: `--attach`, remote URL, SSH tunnel, Storybook            |
| [`docs/app-url.md`](docs/app-url.md)                                                           | URL resolution, ports, `TARGET_URL`, `dev-tools-app-target`              |
| [`docs/component-validation-contract.md`](docs/component-validation-contract.md)               | `data-testid` naming, scope and registry                                 |
| [`docs/design-spec-validation.md`](docs/design-spec-validation.md)                             | Agent design checks: snapshot, screenshot, `browser eval`                |
| [`docs/decisions/`](docs/decisions/)                                                           | Decision records: why the repo works this way                            |

Pick the **lightest** tool for the question: `pnpm test` (logic) · `pnpm e2e` (CI regression) ·
Storybook (isolated UI) · browser-validation skill (live dev DOM/text) · browser-capture skill (artifacts).

## Agent config (rulesync)

This repo uses [rulesync](https://github.com/dyoshikawa/rulesync) to generate tool-specific files from `.rulesync/`:

| Edit                                                                                 | Do not edit directly                                                                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (canonical)                                                              | —                                                                                                                   |
| `.rulesync/rules/`, `.rulesync/skills/`, `.rulesync/commands/`, `.rulesync/mcp.json` | `.cursor/rules/`, `.cursor/commands/`, `.claude/rules/`, `.claude/skills/`, `.claude/commands/`, `.cursor/mcp.json` |

After changing `.rulesync/**`, run `pnpm sync:agents` and commit the generated outputs. The pre-commit hook (when agent config files are staged) and `pnpm quality-checks` run `pnpm check:agents`, which fails when a generated file differs from its source. Skills sync to `.claude/skills/` (discovered by Cursor and Claude Code). Commands sync to `.cursor/commands/` and `.claude/commands/`.

The `concision`, `conversation-style`, `documentation`, `git`, `jsdoc`, `security` and `testing` rules come from [`andrej-kolic/playbook`](https://github.com/andrej-kolic/playbook), set in `rulesync.jsonc` and pinned in `rulesync.lock`. `pnpm rules:outdated` checks for changes, `pnpm rules:update` takes them, and `pnpm rules:install` fetches the pinned versions. Edit them in the playbook repo, not in `.rulesync/rules/`: a file there with the same name replaces the playbook rule. After cloning, run `pnpm rules:install` once: `pnpm check:agents` needs the fetched copies in `.rulesync/rules/.curated/` and otherwise fetches them from GitHub.

## Gotchas

- **Lint** may report `no-console` warnings in app-core/ui; they are warnings, not errors.
- **Chrome capture** (`pnpm chrome:debug`, port 9222) and `packages/browser-capture` are optional; not required for SPA dev.
- **Deploy** (`pnpm deploy:aws`, `pnpm deploy:netlify`) needs cloud credentials and is out of scope for local UI work.
