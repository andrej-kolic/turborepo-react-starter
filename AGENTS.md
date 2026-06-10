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
single source of truth. Bundler configs and browser tooling all read from it.

| Service                | Dev port | Preview port | Start                                         |
| ---------------------- | -------- | ------------ | --------------------------------------------- |
| **app-vite** (default) | 5173     | 4173         | `pnpm dev:app`                                |
| app-webpack            | 8080     | 8080         | set `BUNDLER=app-webpack` then `pnpm dev:app` |
| app-esbuild            | 8000     | 8000         | set `BUNDLER=app-esbuild` then `pnpm dev:app` |
| ui-storybook           | 6006     | 6007         | `pnpm dev:ui`                                 |

To validate a production build locally, run `pnpm preview:app` (or `pnpm preview:ui` for Storybook) and use the `previewPort` in `--url`.

Avoid root `pnpm dev` unless you need all bundlers + Storybook + commons watch at once; it is heavy.

## Common commands

See root `README.md` and `package.json` scripts. Typical loop:

- Lint: `pnpm lint`
- Test: `pnpm test`
- Build app (current `BUNDLER`): `pnpm build:app`
- Format check: `pnpm check:format`
- Full quality gate: `pnpm quality-checks`

## Browser validation

> **Read the [`browser-validation`](.cursor/skills/browser-validation/SKILL.md) skill first** before
> doing any browser-related work. Full decision flowchart and environment scenarios are in
> [`docs/browser-validation.md`](docs/browser-validation.md).

Pick the **lightest** path that answers the question:

| Goal                                     | Tool                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| Logic / hooks / pure functions           | `pnpm test`                                                             |
| Component UI in isolation                | `pnpm dev:ui` → Storybook `:6006`                                       |
| Assert DOM / text (IDE + MCP available)  | `chrome-devtools` MCP                                                   |
| Co-dev on visible Chrome (no MCP)        | `pnpm browser:open` then `pnpm browser:* --attach`                      |
| Assert DOM / text (Cloud Agent, SSH, CI) | `pnpm browser:validate` / `pnpm browser:read` (default — no `--attach`) |
| Design tokens / custom checks (no MCP)   | `pnpm browser:eval`                                                     |
| Visual spot-check vs design (no MCP)     | `pnpm browser:screenshot`                                               |
| HAR / trace / Web Vitals / CI artifact   | `devtools-capture` MCP                                                  |

**URL convention:** agents should pass `--url` explicitly. CI scripts may omit it and rely on `APP_URL` or `BUNDLER` port derivation (see `docs/browser-validation.md`).

**Cloud Agent note:** MCP servers are not available in Cloud Agent sessions. Use
`pnpm browser:validate --url <url> --selector "[data-testid=…]"` for DOM assertions instead —
pass `--url` explicitly (port follows `BUNDLER`; see Services table above). Do **not** use
`--attach` in headless/Cloud Agent environments — default isolated sessions are correct there.
For SSH tunnel setup, see Scenario 3 in `docs/browser-validation.md`.

## Gotchas

- **MCP config:** `.cursor/mcp.json` (`mcpServers`) and `.vscode/mcp.json` (`servers`) must stay
  identical — run `pnpm check:mcp-config` (also in `quality-checks` and pre-commit when either file
  changes).
- **Lint** may report `no-console` warnings in app-core/ui; they are warnings, not errors.
- **Chrome capture** (`pnpm chrome:debug`, port 9222) and `packages/browser-capture` are optional; not required for SPA dev.
- **Deploy** (`pnpm deploy:aws`, `pnpm deploy:netlify`) needs cloud credentials and is out of scope for local UI work.
