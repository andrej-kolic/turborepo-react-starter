# @repo/browser-capture

**Capture/instrumentation only — not for routine verification.** Records HAR files, Playwright traces, Web Vitals, and console logs from any URL. For DOM/text assertions use `@repo/browser-tools` (`pnpm browser validate`) or the `chrome-devtools` MCP — see [`docs/browser-validation.md`](../../docs/browser-validation.md).

Chrome DevTools artifact capture CLI and MCP server for Copilot workflows, with CI integration and MCP tool exposure for agent-driven debugging.

Powered by [playwright-core](https://playwright.dev/) over Chrome DevTools Protocol (CDP). Connects to a Chrome instance started by `pnpm chrome:debug` (`packages/browser-tools/bin/chrome.js`) — no bundled browser binary needed.

## Commands

| Command                     | Output                                                                       | Description                                                                        |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `capture-snapshot`          | `metadata.json`, `version.json`, `pages.json`                                | Fetch browser metadata and open page list                                          |
| `record-trace <url>`        | `metadata.json`, `har.json`, `trace.zip`, `console.json`, `performance.json` | Navigate and record: HAR (network), Playwright trace, console messages, Web Vitals |
| `record-performance <url>`  | `metadata.json`, `performance.json`                                          | Navigate and collect LCP, CLS, INP and 36 CDP browser metrics                      |
| `record-console`            | `metadata.json`, `console.json`                                              | Monitor console messages on the current page for a set duration                    |
| `record-interactions <url>` | `metadata.json`, `interactions.json`, `generated.test.ts`                    | Record clicks/fills/navigation and generate a Playwright test file                 |
| `sanitize-artifacts <dir>`  | _(modifies existing artifact files in-place)_                                | Strip secrets & PII: redact sensitive headers, fill values, and console text       |
| `upload-artifacts`          | `artifacts-<timestamp>.tar.gz`                                               | Package the `artifacts/` directory as a tar.gz                                     |
| `mcp-server`                | —                                                                            | Start an MCP server (stdio) exposing capture commands as tools                     |

## Usage

App URL examples use `http://localhost:5173` (default `BUNDLER=app-vite`). For other bundlers,
use the `devPort` from `apps/<BUNDLER>/package.json` — see [`docs/browser-validation.md`](../../docs/browser-validation.md).

From repo root, prefer **`pnpm capture <subcommand>`** — loads `.env`, injects `APP_URL` via
`dev-tools-app-target run` (same as `pnpm browser`). URL positional is optional when `APP_URL` is set.

```bash
# Prerequisites: app running, Chrome on port 9222
pnpm browser:ensure-app
pnpm chrome:debug

# Root wrappers (APP_URL from BUNDLER)
pnpm capture capture-snapshot
pnpm capture record-trace --duration 5
pnpm capture record-performance
pnpm capture record-console
pnpm capture record-interactions --duration 10
pnpm capture upload-artifacts

# Direct CLI (CI, MCP path, or explicit URL)
node packages/browser-capture/bin/browser-capture.js capture-snapshot
node packages/browser-capture/bin/browser-capture.js record-trace http://localhost:5173
node packages/browser-capture/bin/browser-capture.js record-performance http://localhost:5173
node packages/browser-capture/bin/browser-capture.js record-console
node packages/browser-capture/bin/browser-capture.js record-interactions http://localhost:5173
node packages/browser-capture/bin/browser-capture.js sanitize-artifacts packages/browser-capture/artifacts/trace-<timestamp>
node packages/browser-capture/bin/browser-capture.js upload-artifacts

# Duration control (default: 10s)
pnpm capture record-trace --duration 5
node packages/browser-capture/bin/browser-capture.js record-trace http://localhost:5173 --duration-ms 3000

# Skip automatic sanitization (e.g. for local debugging — never do this in CI)
pnpm capture record-trace --no-sanitize

# Attach to the existing visible tab (preserves auth/session; does not navigate)
pnpm browser:setup
pnpm browser open --url http://localhost:5173
pnpm capture record-trace --attach --duration 5
pnpm capture record-performance --attach
pnpm capture record-interactions --attach --duration 10
pnpm capture record-console --attach --duration 3
```

### `--attach`: record on the existing visible tab

By default, navigate-based capture commands open a **new isolated browser context** (no cookies, no auth). Add `--attach` to record on the tab already open in the visible Chrome window — preserving its session, cookies, and current URL.

`--attach` matches by **origin** (`scheme://host:port`) — any tab at that origin qualifies. The command does **not** navigate; it records whatever the tab currently shows. If no tab is found at that origin, the error hints to run `browser-tools open --url <url>` first.

|                       | Default (no `--attach`)           | `--attach`                                    |
| --------------------- | --------------------------------- | --------------------------------------------- |
| `record-trace`        | New context + navigate + full HAR | Existing tab; HAR covers capture window only  |
| `record-performance`  | New context + navigate            | Existing tab; no navigation                   |
| `record-interactions` | New context + navigate            | Existing tab; interact during capture window  |
| `record-console`      | Most recent open tab              | With URL: match by origin; without URL: no-op |

Commands supporting `--attach`: `record-trace`, `record-performance`, `record-interactions`, `record-console` (with URL).

## MCP Server

The `mcp-server` command starts a [Model Context Protocol](https://modelcontextprotocol.io/) server over stdio, exposing six capture MCP tools that Copilot agents can call directly — no shell access needed.

### Available MCP Tools

| Tool                  | Inputs                                                                | Description                                                                   |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `capture_snapshot`    | —                                                                     | Capture browser metadata and open page list                                   |
| `record_trace`        | `url` (required), `duration` (optional, seconds), `attach` (optional) | Full trace: HAR + Playwright trace + console + Web Vitals                     |
| `record_performance`  | `url` (required), `duration` (optional, seconds), `attach` (optional) | Web Vitals + CDP browser metrics                                              |
| `record_console`      | `duration` (optional, seconds), `url` (optional), `attach` (optional) | Console messages from current tab                                             |
| `record_interactions` | `url` (required), `duration` (optional, seconds), `attach` (optional) | Record user interactions and generate a Playwright test (`generated.test.ts`) |
| `sanitize_artifacts`  | `dir` (required, absolute path)                                       | Strip secrets & PII from an artifact directory (safe to re-run)               |

Each tool returns both a human-readable text summary and structured JSON (`artifactsDir`, `webVitals`, `requestCount`, etc.).

### VS Code Setup (already configured in `.vscode/mcp.json`)

The `devtools-capture` MCP server is pre-configured in `.vscode/mcp.json` and `.cursor/mcp.json`. It starts automatically when your agent session loads. Requires Chrome running on port 9222 (`pnpm chrome:debug`).

### Copilot CLI Setup (user-level — not committed to repo)

Add to `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "devtools-capture": {
      "command": "node",
      "args": [
        "/absolute/path/to/turborepo-react-starter/packages/browser-capture/bin/browser-capture.js",
        "mcp-server"
      ],
      "env": { "CHROME_DEBUG_PORT": "9222" }
    }
  }
}
```

> Agents: see the [`browser-capture`](../../.claude/skills/x-browser-capture/SKILL.md) skill for a quick-start entry point. This README is the full tool reference.

## Artifacts

All commands write artifacts to `packages/browser-capture/artifacts/<mode>-<timestamp>/`.

### `har.json`

Standard HAR 1.2 format. Open in Chrome DevTools → Network → Import HAR, or tools like [Insomnia](https://insomnia.rest/) and [HAR Analyzer](https://toolbox.googleapps.com/apps/har_analyzer/).

### `trace.zip`

Playwright trace format. View with:

```bash
npx playwright show-trace packages/browser-capture/artifacts/trace-*/trace.zip
```

### `performance.json`

Contains:

- `webVitals`: `lcp` (ms), `cls` (score), `inp` (ms)
- `browserMetrics`: 36 CDP `Performance.getMetrics()` values (JSHeapUsedSize, TaskDuration, etc.)
- `runtimeMetrics`: raw PerformanceObserver entries (navigation, paint, LCP, CLS, INP events)

### `console.json`

Console messages and page errors captured during the session. Each entry has `channel` (`runtime` or `exception`), `type`, `text`, `location`, and `timestamp`.

### `interactions.json` (from `record-interactions`)

Array of recorded user interactions. Each entry includes:

- `type`: `click`, `fill`, `check`, `uncheck`, `selectOption`, or `navigate`
- `element`: `{ tag, id, testId, ariaLabel, role, text, inputType, name }` — element metadata used to generate stable Playwright locators
- `value`: filled/selected value (for `fill` and `selectOption`)
- `react` (dev mode only): `{ componentName, fileName, lineNumber, columnNumber, originalSource }` — React component info resolved from fiber internals and source maps
- `timestamp`: epoch ms

### `generated.test.ts` (from `record-interactions`)

A ready-to-run Playwright test generated from the recorded interactions. Locators follow the priority: `getByTestId` > `getByLabel` > `#id` > `getByRole(+name)` > `getByText`. When React component info is available, source location is added as a comment.

Example output:

```typescript
import { test, expect } from '@playwright/test';

// Generated by browser-capture record-interactions
// Source: http://localhost:5173/
// Captured: 2026-05-31T...

test('recorded: localhost/', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.getByTestId('email-input').fill('user@example.com'); // LoginForm src/components/LoginForm.tsx:42
  await page.getByRole('button', { name: 'Sign in' }).click(); // LoginButton src/components/LoginButton.tsx:15
});
```

## Environment Variables

| Variable              | Default     | Description                                                                    |
| --------------------- | ----------- | ------------------------------------------------------------------------------ |
| `CHROME_DEBUG_PORT`   | `9222`      | CDP port                                                                       |
| `CHROME_DEBUG_HOST`   | `localhost` | CDP host                                                                       |
| `CAPTURE_DURATION_MS` | `10000`     | Default capture duration (ms) — per-tool `duration` arg takes precedence       |
| `APP_URL`             | —           | Default URL when using `pnpm capture` (injected by `dev-tools-app-target run`) |
| `CAPTURE_URL`         | —           | Fallback default URL when `APP_URL` is unset                                   |
| `CAPTURE_BRANCH`      | git branch  | Override branch in metadata                                                    |
| `GITHUB_ACTOR`        | —           | Set automatically by CI; logged in `metadata.json` for audit trail             |
| `GITHUB_EVENT_NAME`   | —           | Set automatically by CI; logged in `metadata.json` (`triggerEvent`)            |

## CI Integration

The included GitHub Actions workflow (`.github/workflows/capture-devtools.yml`) runs when you comment `/capture-trace` on a PR or when manually dispatched. Despite the comment name, the workflow runs a headless `capture-snapshot` health check (not a full `record-trace`). It starts Chrome via `pnpm chrome:debug`, uploads artifacts to the Actions run, and posts a comment with a link. For full traces locally, run `record-trace` via CLI or the `devtools-capture` MCP.

## Security

All capture commands run artifact sanitization automatically before writing results. See [`SECURITY.md`](./SECURITY.md) for the full policy, rules, and RBAC model.
