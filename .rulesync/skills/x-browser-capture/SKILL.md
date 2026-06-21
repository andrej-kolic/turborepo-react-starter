---
name: x-browser-capture
description: >-
  Capture Chrome DevTools artifacts — HAR, Playwright traces, Web Vitals
  (LCP/CLS/INP), console logs, and recorded interactions — via the
  devtools-capture MCP server or the browser-capture CLI. Use when the user
  asks to record a trace, profile performance, capture network/HAR, dump
  console, or produce a CI debugging artifact. For routine DOM/text checks, use
  the browser-validation skill instead.
targets:
  - claudecode
---

# Browser Capture

Capture/instrumentation only — produces artifacts. For routine DOM/text verification, use the
**browser-validation** skill first.

## Prerequisites

```bash
# Start Chrome and open a tab (idempotent) — required_permissions: all
# URL auto-resolves from BUNDLER via dev-tools-app-target run; pass --url to override
pnpm browser:setup

# Check / stop Chrome if needed
pnpm chrome:debug --status  # check (probes localhost:9222/json/version)
pnpm chrome:debug --stop    # stop
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
devtools-capture MCP → record_trace url="http://localhost:<port>" attach=true duration=5
```

## `--attach` (preserve auth/session)

Navigate-based capture opens a **new isolated context** by default. Add `--attach` (CLI) or `attach=true` (MCP) to record on the tab already open in visible Chrome — same semantics as `browser-tools --attach`:

1. `pnpm browser:setup` then `pnpm browser open --url <url>` to land on the page first
2. Run capture with `--attach` — matches tab by **origin**, does **not** navigate

```bash
pnpm capture record-trace --attach --duration 5
pnpm capture record-console --attach --duration 3
```

Commands: `record-trace`, `record-performance`, `record-interactions`, `record-console` (with URL).

## CLI (when MCP is unavailable — CI, Cloud Agent, SSH)

Prefer **`pnpm capture <subcommand>`** from repo root — same `APP_URL` injection as `pnpm browser`.
Bootstrap with `pnpm browser:ensure-app`, `pnpm browser:setup`, and `pnpm chrome:debug` first.

```bash
pnpm capture capture-snapshot
pnpm capture record-trace --duration 5
pnpm capture record-trace --attach --duration 5
pnpm capture upload-artifacts
```

Direct CLI (explicit URL or when not using root wrapper):

```bash
node packages/browser-capture/bin/browser-capture.js record-trace http://localhost:<port>
```

Commands: `capture-snapshot`, `record-trace`, `record-performance`, `record-console`,
`record-interactions`, `upload-artifacts`, `mcp-server`.

Artifacts are written to `packages/browser-capture/artifacts/<mode>-<timestamp>/`.

## Full reference

- Per-tool inputs/returns, artifact formats, env vars, CLI flags:
  [`packages/browser-capture/README.md`](../../../packages/browser-capture/README.md)
- Where capture fits among the verification tiers:
  [`docs/browser-validation.md`](../../../docs/browser-validation.md)
