# Copilot instructions for turborepo-react-starter

Purpose

- Short, actionable guidance for Copilot sessions: how to build, test, lint, and where to find architecture and conventions.

Build / Test / Lint (root)

- Install: pnpm install
- Build all: pnpm build
- Dev (all): pnpm dev
- Test all: pnpm test
- Lint all: pnpm lint
- Run type checks: pnpm check:type
- Run formatting check: pnpm run check:format

Per-package / per-app commands (examples)

- Build one package/app: pnpm --filter <pkg-or-app> build
  e.g. pnpm --filter app-vite build
- Dev one app: pnpm --filter app-vite dev
  or set BUNDLER and use root wrapper: BUNDLER=app-vite pnpm dev:app
- Run tests for a single package: pnpm --filter <pkg> test
  e.g. pnpm --filter @repo/ui test
- Run a single test (Vitest): pnpm --filter @repo/ui test -- -t "TestNamePattern"
- Lint one package: pnpm --filter <pkg> lint
- Type-check one package: pnpm --filter <pkg> run check:type

High-level architecture

- Monorepo managed with Turbo + pnpm workspaces.
- Root orchestrates per-package scripts via `turbo run` and uses `dotenv --` to load .env when running scripts.
- Apps (in `apps/`) are multiple bundler options: app-esbuild, app-vite, app-webpack. Storybook lives at `apps/ui-storybook`.
- Packages (in `packages/`) are mostly "light" TypeScript source-only libs (e.g. @repo/ui, app-core, commons, dev-tools, eslint-config, typescript-config).
- Infra folders (`infra/`) include AWS CloudFormation & Netlify deploy helpers and scripts.
- Shared conventions come from `@repo/typescript-config` and `@repo/eslint-config` provided in the monorepo.

Key conventions and notes for Copilot

- Use pnpm + turbo idioms: prefer `pnpm --filter <pkg>` for single-package actions, and `pnpm <script>` at repo root for cross-package orchestration.
- Many root scripts are wrappers that rely on the BUNDLER env var (e.g. `dev:app`, `build:app`). Use `BUNDLER=app-vite pnpm dev:app` or `pnpm --filter app-vite dev`.
- Internal packages use `workspace:*` in package.json. Internal package names use `@repo/` prefix.
- Some packages export code directly (no build step). Check package.json `exports` and `main` before adding build steps.
- TypeScript config is centralized in `@repo/typescript-config` — prefer it over individual tsconfig modifications.
- ESLint rules live under `packages/eslint-config`.
- Tests: `vitest` is used in UI package; other packages may not have tests configured. Use `pnpm --filter <pkg> test` to scope.
- Formatting/linting: prettier and eslint are enforced; husky is configured in root `prepare` script. Avoid committing unformatted code.
- Deployment: `infra/aws` and `infra/netlify` contain deploy scripts; root has `deploy:aws` and `deploy:netlify` wrappers.
- Avoid editing generated infra deployment scripts without confirmation — they have environment-specific behavior.

### Chrome Remote Debugging (for Agents & Browser Inspection)

Agents can inspect pages using Chrome DevTools Protocol (CDP) by first starting Chrome with debugging enabled.

#### Quick Start

Start Chrome with debugging on port 9222:

```bash
pnpm chrome:debug
```

This will:

- Automatically detect Chrome on your machine
- Start Chrome with remote debugging enabled (`--remote-debugging-port=9222`)
- Create an isolated debugging session
- Print the DevTools URL for manual inspection

Check if Chrome is running:

```bash
pnpm chrome:debug:status
```

Stop Chrome cleanly:

```bash
pnpm chrome:debug:stop
```

#### For Agents

When agents need to inspect pages:

1. **Ensure Chrome is running:** `pnpm chrome:debug`
2. **Connect to Chrome:** MCP connects to `http://localhost:9222`
3. **Use browser tools:** All Chrome DevTools MCP tools are auto-discoverable and self-documenting. See [chrome-devtools-mcp docs](https://github.com/ChromeDevTools/chrome-devtools-mcp) for full reference.

#### MCP Setup (one-time per machine)

The repo includes `.vscode/mcp.json` for VS Code users. For the **Copilot CLI**, create `~/.copilot/mcp-config.json` with:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browserUrl",
        "http://localhost:9222"
      ]
    }
  }
}
```

#### Advanced

**Custom port:**

```bash
CHROME_DEBUG_PORT=9223 pnpm chrome:debug
```

**Custom Chrome location (macOS example):**

```bash
CHROME_PATH="/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary" pnpm chrome:debug
```

**Check session directory:**

```bash
ls ~/.chrome-debugging-sessions/
```

#### Troubleshooting

- **Chrome not found:** Install Google Chrome or set `CHROME_PATH` env var
- **Port in use:** Check `pnpm chrome:debug:status` or stop with `pnpm chrome:debug:stop`
- **Connection refused:** Wait a few seconds for Chrome to fully start
- **Headless mode needed:** Edit `scripts/chrome-debug.js` and add `--headless=new` to chrome args

- README.md (project overview)
- apps/\*/README.md (per-app notes)
- packages/eslint-config/README.md
- packages/\*/package.json for per-package scripts and exports

Assistant behavior guidance

- When asked to run commands, prefer non-destructive read-only operations first (lint, typecheck, test). Run builds only on explicit request.
- When modifying package.json or workspace settings, keep changes minimal and run `pnpm install` if dependencies change.
- Do not add secrets or credentials to repository files; use .env and CI secrets.

MCP servers

- This is a frontend monorepo. Would you like assistance setting up MCP servers for Playwright or Storybook for browser testing and component previews? (Yes/No)

---

Created by Copilot CLI helper. Update this file with new commands or conventions as the repo evolves.
