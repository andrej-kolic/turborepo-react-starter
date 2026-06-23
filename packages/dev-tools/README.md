# @repo/dev-tools

Workspace-aware development utilities for this monorepo.

## `config/` — importable modules

Used by bundler apps and tooling:

- **`app-port`** — `devPort` / `previewPort` / URL resolution from `apps/*/package.json`
- **`environment`** — `.env` loading for bundler configs
- **`paths`** — `@repo/app-core` public/env paths for bundlers

## `bin/` — CLI entrypoints

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `dev-tools-app-target` | Resolve app URL/port or run a child with `APP_URL` set |

Subcommands:

- `dev-tools-app-target url [--preview]` — print resolved URL
- `dev-tools-app-target port [--preview]` — print resolved port
- `dev-tools-app-target resolve [--preview]` — print URL and port (tab-separated)
- `dev-tools-app-target run <cmd> [args...]` — run command with dev `APP_URL` injected

Root `pnpm browser:*` scripts use `dev-tools-app-target run`. Plain-Node repo workflows stay in `/scripts`.

Run bins via `pnpm exec` or root `package.json` scripts after `@repo/dev-tools` is a dependency.
