# @repo/dev-tools

Workspace-aware development utilities for this monorepo.

## `config/` — importable modules

Used by bundler apps and tooling:

- **`app-port`** — `devPort` / `previewPort` / URL resolution from `apps/*/package.json`
- **`environment`** — `.env` loading for bundler configs
- **`paths`** — `@repo/app-core` public/env paths for bundlers

## `bin/` — CLI entrypoints

| Command                    | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `dev-tools-with-app-url`   | Resolve `APP_URL` from `BUNDLER` and spawn a child command |
| `dev-tools-print-app-port` | Print resolved dev port (CI shell scripts)                 |

Root `pnpm browser:*` scripts use `dev-tools-with-app-url`. Plain-Node repo workflows stay in `/scripts`.

Run bins via `pnpm exec` or root `package.json` scripts after `@repo/dev-tools` is a dependency.
