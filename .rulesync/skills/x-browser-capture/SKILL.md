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

## Step 1 — Ensure app is running

```bash
pnpm browser:ensure-app   # required_permissions: network
```

Exits 0 when live. URL is resolved automatically from `BUNDLER` in `.env`. Note the `App: UP <url>` line in the output — you need it for both tiers.

## Step 2 — Pick capture tier

Use attach only in visible Chrome to preserve session and tab state — not in CI. Run `pnpm browser open --url <url>` first.

### A — `devtools-capture` MCP

Attach: `attach=true` on the tool.

**When:** `record_trace` is in your tool list.

Use the URL from Step 1. Do not run CLI capture commands.

| Goal                  | Tool                  | Key args                    |
| --------------------- | --------------------- | --------------------------- |
| Health check          | `capture_snapshot`    | —                           |
| Full trace            | `record_trace`        | `url`, `duration` (seconds) |
| Web Vitals / metrics  | `record_performance`  | `url`                       |
| Console dump          | `record_console`      | `duration` (tab must exist) |
| Interaction recording | `record_interactions` | `url`, `duration`           |

---

### B — CLI (no MCP)

Attach: `--attach` on the command.

```bash
pnpm browser:setup   # required_permissions: all
```

URL is resolved automatically. Pass `--url <url>` only to override (Storybook, remote, preview port).

If capture fails with "connection refused":

```bash
pnpm chrome:debug   # required_permissions: all
```

Retry. Do not fall back to verify-tier tools.

| Goal                  | Command                                          |
| --------------------- | ------------------------------------------------ |
| Health check          | `pnpm capture capture-snapshot`                  |
| Full trace            | `pnpm capture record-trace --duration 5`         |
| Web Vitals / metrics  | `pnpm capture record-performance`                |
| Console dump          | `pnpm capture record-console --duration 3`       |
| Interaction recording | `pnpm capture record-interactions --duration 10` |
| Package for CI        | `pnpm capture upload-artifacts`                  |

Artifacts land in `packages/browser-capture/artifacts/<mode>-<timestamp>/`.

---

For routine DOM/text verification use the browser-validation skill — never mix tiers.

> Edge-case scenarios (`--attach`, remote URL, SSH tunnel), Storybook URL, artifact formats, and env vars: [`docs/browser-validation.md`](../../../docs/browser-validation.md) · [`packages/browser-capture/README.md`](../../../packages/browser-capture/README.md)
