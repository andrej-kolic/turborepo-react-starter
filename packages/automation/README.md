# @repo/automation

Chrome DevTools artifact capture CLI for Copilot workflows. Captures network traffic (HAR), Playwright traces, Web Vitals, and console logs from any URL, with CI integration.

Powered by [playwright-core](https://playwright.dev/) over Chrome DevTools Protocol (CDP). Connects to a Chrome instance started by `scripts/chrome-debug.js` — no bundled browser binary needed.

## Commands

| Command                    | Output                                                                       | Description                                                                        |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `capture-snapshot`         | `metadata.json`, `version.json`, `pages.json`                                | Fetch browser metadata and open page list                                          |
| `record-trace <url>`       | `metadata.json`, `har.json`, `trace.zip`, `console.json`, `performance.json` | Navigate and record: HAR (network), Playwright trace, console messages, Web Vitals |
| `record-performance <url>` | `metadata.json`, `performance.json`                                          | Navigate and collect LCP, CLS, INP and 36 CDP browser metrics                      |
| `record-console`           | `metadata.json`, `console.json`                                              | Monitor console messages on the current page for a set duration                    |
| `upload-artifacts`         | `artifacts-<timestamp>.tar.gz`                                               | Package the `artifacts/` directory as a tar.gz                                     |

## Usage

```bash
# Prerequisites: Chrome running on port 9222
pnpm chrome:debug

# From repo root
node packages/automation/bin/copilot-devtools.js capture-snapshot
node packages/automation/bin/copilot-devtools.js record-trace https://localhost:3000
node packages/automation/bin/copilot-devtools.js record-performance https://localhost:3000
node packages/automation/bin/copilot-devtools.js record-console
node packages/automation/bin/copilot-devtools.js upload-artifacts

# Duration control (default: 10s)
node packages/automation/bin/copilot-devtools.js record-trace https://localhost:3000 --duration 5
node packages/automation/bin/copilot-devtools.js record-trace https://localhost:3000 --duration-ms 3000
```

## Artifacts

All commands write artifacts to `packages/automation/artifacts/<mode>-<timestamp>/`.

### `har.json`

Standard HAR 1.2 format. Open in [Chrome DevTools > Network > Import HAR](chrome://about) or tools like [Insomnia](https://insomnia.rest/), [HAR Analyzer](https://toolbox.googleapps.com/apps/har_analyzer/).

### `trace.zip`

Playwright trace format. View with:

```bash
npx playwright show-trace packages/automation/artifacts/trace-*/trace.zip
```

### `performance.json`

Contains:

- `webVitals`: `lcp` (ms), `cls` (score), `inp` (ms)
- `browserMetrics`: 36 CDP `Performance.getMetrics()` values (JSHeapUsedSize, TaskDuration, etc.)
- `runtimeMetrics`: raw PerformanceObserver entries (navigation, paint, LCP, CLS, INP events)

### `console.json`

Console messages and page errors captured during the session. Each entry has `channel` (`runtime` or `exception`), `type`, `text`, `location`, and `timestamp`.

## Environment Variables

| Variable              | Default     | Description                                |
| --------------------- | ----------- | ------------------------------------------ |
| `CHROME_DEBUG_PORT`   | `9222`      | CDP port                                   |
| `CHROME_DEBUG_HOST`   | `localhost` | CDP host                                   |
| `CAPTURE_DURATION_MS` | `10000`     | Default capture duration (ms)              |
| `CAPTURE_URL`         | —           | Default URL for trace/performance commands |
| `CAPTURE_BRANCH`      | git branch  | Override branch in metadata                |

## CI Integration

The included GitHub Actions workflow (`.github/workflows/devtools.yml`) runs when you comment `/capture-trace` on a PR or when manually dispatched. It starts headless Chrome via `scripts/chrome-debug.js`, runs `capture-snapshot`, uploads artifacts to the Actions run, and posts a comment with a link.

## Security

Artifacts may contain sensitive data (auth headers, cookies, PII). The `record-trace` command uses `content: 'omit'` in HAR recording so response bodies are excluded. Sanitize artifacts before sharing publicly. See Phase 4 of the implementation plan for planned sanitization features.
