@AGENTS.md

## MCP setup for the Copilot CLI

IDE users already have [`.vscode/mcp.json`](../.vscode/mcp.json) (Copilot) and
[`.cursor/mcp.json`](../.cursor/mcp.json). For the **Copilot CLI**, create
`~/.copilot/mcp-config.json` (not committed):

1. Copy the `servers` block from `.vscode/mcp.json` into an `mcpServers` object (Copilot uses that
   key name).
2. Replace the `devtools-capture` script path with an **absolute** path to
   `packages/browser-capture/bin/browser-capture.js` in your clone.

Full example:
[`packages/browser-capture/README.md`](../packages/browser-capture/README.md#copilot-cli-setup-user-level--not-committed-to-repo).
Requires Chrome on port 9222 (`pnpm chrome:debug`).
