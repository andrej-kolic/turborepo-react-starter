# Copilot instructions for turborepo-react-starter

> **Canonical guidance lives in [`AGENTS.md`](../AGENTS.md).** Read it first for setup, commands,
> ports, and conventions. For browser work, follow the
> [`browser-validation`](../.cursor/skills/_browser-validation/SKILL.md) skill and
> [`docs/browser-validation.md`](../docs/browser-validation.md).

This file only covers GitHub Copilot–specific setup not in `AGENTS.md`.

## MCP setup for the Copilot CLI

IDE users already have `.vscode/mcp.json` and `.cursor/mcp.json`. For the **Copilot CLI**, create
`~/.copilot/mcp-config.json` (not committed):

1. Copy the `servers` block from [`.vscode/mcp.json`](../.vscode/mcp.json) into an `mcpServers`
   object (Copilot uses that key name).
2. Replace the `devtools-capture` script path with an **absolute** path to
   `packages/browser-capture/bin/copilot-devtools.js` in your clone.

Full example and tool reference:
[`packages/browser-capture/README.md`](../packages/browser-capture/README.md#copilot-cli-setup-user-level--not-committed-to-repo).

Both MCP servers require Chrome on port 9222 (`pnpm chrome:debug`):

- `chrome-devtools` — DOM verification (`navigate_page`, `evaluate_script`, `take_snapshot`)
- `devtools-capture` — artifact capture (HAR, traces, Web Vitals); see the
  [`browser-capture`](../.cursor/skills/_browser-capture/SKILL.md) skill

For Storybook, use `pnpm dev:ui` (port and URLs in [`AGENTS.md`](../AGENTS.md)).

## Assistant behavior

- Prefer read-only operations first (lint, type-check, test); run builds only on explicit request.
- Keep `package.json`/workspace changes minimal; run `pnpm install` if dependencies change.
- Never add secrets or credentials to repository files; use `.env` and CI secrets.
