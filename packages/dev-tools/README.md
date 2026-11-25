# @repo/dev-tools

Workspace-aware development utilities for this monorepo.

## `config/` — importable modules

Used by bundler apps and tooling:

- **`app-port`** — `devPort` / `previewPort` / URL resolution from `apps/*/package.json`
- **`environment`** — `.env` loading for bundler configs, validated against the Zod schema in `@repo/client-types/env-schema` ([adding a variable](../../docs/template/env.md))
- **`sentry-sourcemaps`** — the upload-and-delete step behind `dev-tools-sentry-sourcemaps`
- **`env-guards-check`**, **`page-split-check`** — the build output checks behind `dev-tools-check-env-guards` and `dev-tools-check-page-split`, reading the build through **`build-output`**
- **`paths`** — `@repo/web` public/env paths for bundlers
- **`size-limit`** — bundle size limits shared by the bundler apps ([bundle size check](../../docs/template/bundle-size.md))

## `bin/` — CLI entrypoints

| Command                                  | Purpose                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dev-tools-app-target`                   | Resolve app URL/port or run a child with `TARGET_URL` set                                                                                        |
| `dev-tools-check-env-guards`             | Check the build in `./dist` keeps and drops code by its env guards ([env variables](../../docs/template/env.md))                                 |
| `dev-tools-check-page-split`             | Check the build in `./dist` loads each page in its own file ([routing](../../docs/template/routing.md))                                          |
| `dev-tools-sentry-sourcemaps <dist-dir>` | Upload a build's source maps to Sentry, then delete them ([readable stack traces](../../docs/template/error-reporting.md#readable-stack-traces)) |

Subcommands:

- `dev-tools-app-target url [--preview]` — print resolved URL
- `dev-tools-app-target port [--preview]` — print resolved port
- `dev-tools-app-target resolve [--preview]` — print URL and port (tab-separated)
- `dev-tools-app-target run <cmd> [args...]` — run command with dev `TARGET_URL` injected

Root `pnpm browser:*` scripts use `dev-tools-app-target run`. Plain-Node repo workflows stay in `/scripts`.

Run bins via `pnpm exec` or root `package.json` scripts after `@repo/dev-tools` is a dependency.
