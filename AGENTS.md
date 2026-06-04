# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Frontend-only **pnpm + Turborepo** monorepo (`turborepo-react-starter`). The main product is `@repo/app-core` served by one of three bundler apps (`app-vite`, `app-webpack`, `app-esbuild`). There is no backend, database, or Docker Compose stack for local dev.

### Environment file

Root scripts use `dotenv-cli` and expect a repo-root `.env`. Copy from `.env.example` if missing. Important variables:

- `BUILD_ENVIRONMENT` — required (e.g. `staging`)
- `BUNDLER` — which app to run with `dev:app` / `build:app` (default in example: `app-vite`)

### Node.js version

`.nvmrc` specifies **Node 24** (matches CI). This VM may also expose `/exec-daemon/node` (Node 22) earlier on `PATH`. Prefer:

```bash
nvm use 24
```

Use `node -v` to confirm before debugging version-specific issues. **pnpm@11.1.3** is pinned via `packageManager` in root `package.json` (Corepack).

### `@repo/commons` build artifact

Apps import `@repo/commons` from `dist/`, which is not committed. Turbo usually builds it when you run `pnpm build`, `pnpm lint`, or `pnpm test`. If dev fails with missing `dist`, run:

```bash
pnpm --filter @repo/commons build
```

### Services (local dev)

| Service                | Port | Start                                         |
| ---------------------- | ---- | --------------------------------------------- |
| **app-vite** (default) | 5173 | `pnpm dev:app`                                |
| app-webpack            | 8080 | set `BUNDLER=app-webpack` then `pnpm dev:app` |
| app-esbuild            | 8000 | set `BUNDLER=app-esbuild` then `pnpm dev:app` |
| ui-storybook           | 6006 | `pnpm dev:ui`                                 |

Avoid root `pnpm dev` unless you need all bundlers + Storybook + commons watch at once; it is heavy.

### Common commands

See root `README.md` and `package.json` scripts. Typical loop:

- Lint: `pnpm lint`
- Test: `pnpm test`
- Build app (current `BUNDLER`): `pnpm build:app`
- Format check: `pnpm check:format`
- Full quality gate: `pnpm quality-checks`

### Gotchas

- **Lint** may report `no-console` warnings in app-core/ui; they are warnings, not errors.
- **Chrome automation** (`pnpm chrome:debug`, port 9222) and `packages/automation` are optional; not required for SPA dev.
- **Deploy** (`pnpm deploy:aws`, `pnpm deploy:netlify`) needs cloud credentials and is out of scope for local UI work.
