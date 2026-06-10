# Copilot instructions for turborepo-react-starter

> **Canonical guidance lives in [`AGENTS.md`](../AGENTS.md).** Read it first.
> It is the single, tool-agnostic source for the project overview, environment setup, Node
> version, build/test/lint commands, the services/ports table, and conventions. This file only
> adds the few things that are specific to GitHub Copilot and not covered there.

## Quick command reference

All commands live in `AGENTS.md` ("Common commands") and root `package.json` scripts. The essentials:

- Install: `pnpm install`
- Lint / test / type-check: `pnpm lint` · `pnpm test` · `pnpm check:type`
- Dev one app: `BUNDLER=app-vite pnpm dev:app` (or `pnpm --filter app-vite dev`)
- Scope to one package: `pnpm --filter <pkg> <script>` (internal packages use the `@repo/` prefix)

## Browser work

Read the [`browser-validation`](../.cursor/skills/_browser-validation/SKILL.md) skill first, then
[`docs/browser-validation.md`](../docs/browser-validation.md) for the full decision tree and
environment scenarios (local, remote, Cloud Agent, SSH).

## MCP setup for the Copilot CLI (Copilot-specific)

IDE users already have `.vscode/mcp.json` and `.cursor/mcp.json`. For the **Copilot CLI**, create a
user-level `~/.copilot/mcp-config.json` (not committed):

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@1.1.1",
        "--browserUrl",
        "http://localhost:9222"
      ]
    },
    "devtools-capture": {
      "command": "node",
      "args": [
        "/absolute/path/to/turborepo-react-starter/packages/browser-capture/bin/copilot-devtools.js",
        "mcp-server"
      ],
      "env": { "CHROME_DEBUG_PORT": "9222" }
    }
  }
}
```

`chrome-devtools` = DOM verification (`navigate_page`, `evaluate_script`, `take_snapshot`).
`devtools-capture` = artifact capture (`record_trace`, `record_performance`, HAR, Web Vitals).
Both require Chrome running: `pnpm chrome:debug` (see `AGENTS.md` and the skills above).

## Assistant behavior

- Prefer read-only operations first (lint, type-check, test); run builds only on explicit request.
- Keep `package.json`/workspace changes minimal; run `pnpm install` if dependencies change.
- Never add secrets or credentials to repository files; use `.env` and CI secrets.
