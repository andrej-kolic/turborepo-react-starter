---
name: browser-capture
description: >-
  Capture Chrome DevTools artifacts — HAR, Playwright traces, Web Vitals
  (LCP/CLS/INP), console logs, and recorded interactions — via the
  devtools-capture MCP server or the copilot-devtools CLI. Use when the user
  asks to record a trace, profile performance, capture network/HAR, dump
  console, or produce a CI debugging artifact. For routine DOM/text checks, use
  the browser-validation skill instead.
---

# Browser Capture

Capture/instrumentation only — produces artifacts. For routine DOM/text verification, use the
**browser-validation** skill first.

## Prerequisites

```bash
pnpm chrome:debug          # start Chrome on :9222 (CHROME_HEADLESS=true for CI/VM)
pnpm chrome:debug:status   # check
pnpm chrome:debug:stop     # stop
```

The `devtools-capture` MCP server is configured in `.cursor/mcp.json` and `.vscode/mcp.json`.

## MCP tools (when MCP is available)

| Tool                  | Produces                                                           |
| --------------------- | ------------------------------------------------------------------ |
| `capture_snapshot`    | Chrome metadata + open-tab list (health check)                     |
| `record_trace`        | HAR, Playwright trace, console, Web Vitals + CDP metrics, metadata |
| `record_performance`  | Web Vitals + browser metrics (lighter — no HAR/screenshots)        |
| `record_console`      | Console output of the currently open tab                           |
| `record_interactions` | Interaction log + generated Playwright test                        |

```text
devtools-capture MCP → record_trace url="http://localhost:<port>" duration=5
devtools-capture MCP → record_performance url="http://localhost:<port>"
```

## CLI (when MCP is unavailable — CI, Cloud Agent, SSH)

```bash
node packages/browser-capture/bin/copilot-devtools.js record-trace http://localhost:<port>
```

Commands: `capture-snapshot`, `record-trace`, `record-performance`, `record-console`,
`record-interactions`, `upload-artifacts`, `mcp-server`.

Artifacts are written to `packages/browser-capture/artifacts/<mode>-<timestamp>/`.

## Full reference

- Per-tool inputs/returns, artifact formats, env vars, CLI flags:
  [`packages/browser-capture/README.md`](../../../packages/browser-capture/README.md)
- Where capture fits among the verification tiers:
  [`docs/browser-validation.md`](../../../docs/browser-validation.md)
