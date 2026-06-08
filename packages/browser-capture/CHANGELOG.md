# Changelog — @repo/browser-capture

All notable changes to the DevTools automation CLI are documented here.

## [Unreleased]

### Phase 6 — Polish & Operations (Completed)

- CI caching: pnpm deps + Chrome binary cached in GitHub Actions
- Monitoring: capture time, artifact size, Chrome startup time tracked in ops reports
- Alerts: failure notifications on devtools.yml job failures + PR comments
- Sanitization: secrets redaction in HAR/console artifacts integrated into CI workflow

### Phase 5 — Security (Completed)

- Artifact sanitization: strips Authorization headers, Set-Cookie, session tokens, API keys
- PII redaction: emails, phone numbers, SSNs, credit cards masked in console logs
- Whitelist-based header filtering: preserves only safe headers (Content-Type, User-Agent, etc.)
- `sanitize-artifacts` command integrated into CI workflow

### Phase 4 — DOM-to-Source Mapping & Test Generation (v0.4.0)

#### New Commands

- **`record-interactions <url>`** — Navigate to URL, record user interactions (clicks, form fills, navigation), extract React component source locations, generate Playwright test
  - Records: click, fill, check, uncheck, selectOption, navigate events
  - Source enrichment: React fiber internals + source map resolution (dev mode only)
  - Output: `interactions.json`, `generated.test.ts`, `metadata.json`
  - Locator strategy: getByTestId > getByLabel > #id > getByRole+name > [name] > getByText > tag

#### New MCP Tool

- **`record_interactions`** — Expose interaction recording as an MCP tool for agents
  - Inputs: `url` (required), `duration` (optional, seconds)
  - Returns: artifact directory, interaction count, test file path

#### Technical Improvements

- Added `@jridgewell/trace-mapping@^0.3.25` — resolve React source maps (Vite, webpack)
- `resolveSourceLocation()` — fetch + parse source maps, resolve line/column to original source
- `interactionToLocator()` — multi-strategy locator generation with fallback chain
- `generatePlaywrightTest()` — template-based TypeScript output with React component comments
- SPA deduplication: suppress pushState events within 1000ms of user clicks
- Type-aware interaction handling: differentiate change events by input type

#### Documentation

- Updated `packages/browser-capture/README.md` with record-interactions command, artifact formats, examples
- Updated `skills/browser-capture/SKILL.md` with `record_interactions` tool docs and agent workflows

---

### Phase 3 — MCP Server Integration (v0.3.0)

#### New Commands

- **`mcp-server`** — Start Model Context Protocol server over stdio, exposing all capture commands as tools

#### New MCP Tools

- `capture_snapshot` — fetch browser metadata + open tabs list
- `record_trace` — navigate + capture HAR + trace + console + perf metrics
- `record_performance` — navigate + capture Web Vitals + CDP browser metrics
- `record_console` — monitor current page console for N seconds

#### Configuration

- Added `@modelcontextprotocol/sdk@^1.29.0` dependency
- Documented user-level MCP config: `~/.copilot/mcp-config.json`
- VS Code: pre-configured in `.vscode/mcp.json`
- Skill docs: `skills/browser-capture/SKILL.md` with tool reference + example agent workflows

#### Security

- MCP tools inherit artifact sanitization (Phase 5)
- No shell access required from agents — all I/O through structured tool responses

---

### Phase 2 — Full Trace & Performance Capture (v0.2.0)

#### New Commands

- **`record-trace <url>`** — Navigate to URL and capture:
  - `har.json` — network timeline (HAR 1.2 format, response bodies omitted by default)
  - `trace.zip` — Playwright trace with screenshots + DOM snapshots
  - `console.json` — console messages + page errors
  - `performance.json` — Web Vitals (LCP, CLS, INP) + 36 CDP browser metrics
  - `metadata.json` — timestamp, branch, commit, Chrome version

- **`record-performance <url>`** — Navigate and collect Web Vitals + CDP browser metrics (lighter than full trace)

- **`record-console`** — Monitor console output on current page for N seconds (non-navigating)

#### Technical Changes

- Migrated from `chrome-remote-interface` (manual CDP) to **`playwright-core`** (higher-level CDP client)
  - No bundled Chromium binary — connects to system Chrome via `chromium.connectOverCDP()`
  - Cleaner API: `context.recordHar()`, `traceFormat: 'playwright-zip'`
  - Context isolation: separate `browser.newContext()` per capture (no shared cookies/localStorage)

- Added CDP session management for exact browser metrics via `Performance.getMetrics()`

#### CI Integration

- Updated `.github/workflows/devtools.yml` to cache Chrome binary + pnpm deps
- Metrics tracking: Chrome startup time, capture duration, artifact size
- Job summary: ops report with metrics + retention policy

#### Code Reduction

- Removed manual HAR builder, CDP trace reader, network collector (~330 lines)
- Total reduction: 953 → 621 lines (35% smaller CLI)

---

### MVP (v0.1.0)

#### Initial Release

- **`capture-snapshot`** — Fetch Chrome metadata + open tabs list
- **`upload-artifacts`** — Package artifacts as tar.gz
- CLI entry point: `packages/browser-capture/bin/copilot-devtools.js`

#### CI Workflow

- GitHub Actions: `.github/workflows/devtools.yml`
  - Triggers: manual dispatch (`workflow_dispatch`) + PR comment (`/capture-trace`)
  - Steps: checkout → pnpm install → start headless Chrome → capture → upload artifacts → PR comment with run link
  - Artifact retention: 30 days (GitHub Actions default)

#### Scripts & Environment

- `scripts/chrome-debug.js` — start/stop Chrome with remote debugging on port 9222
  - Added headless mode support: `CHROME_HEADLESS=true`
  - Added extra args support: `CHROME_EXTRA_ARGS='--disable-gpu'`

#### Documentation

- `packages/browser-capture/README.md` — CLI usage, commands, artifact types, environment variables
- `skills/browser-capture/SKILL.md` — MCP skill reference (populated in Phase 3+)
- Embedded in `.github/copilot-instructions.md` — Chrome remote debugging setup guide

#### Dependencies

- `playwright-core@^1.44.0` — CDP client
- `@modelcontextprotocol/sdk@^1.29.0` — MCP server (Phase 3+)
- `zod@^3.25.0` — schema validation for MCP messages (Phase 3+)

---

## Installation & Usage

### Local Development

```bash
# Start Chrome on port 9222
pnpm chrome:debug

# Run any command
node packages/browser-capture/bin/copilot-devtools.js capture-snapshot
node packages/browser-capture/bin/copilot-devtools.js record-trace http://localhost:5173 --duration 10
node packages/browser-capture/bin/copilot-devtools.js record-interactions http://localhost:5173 --duration 15

# View Playwright traces
npx playwright show-trace packages/browser-capture/artifacts/trace-*/trace.zip
```

### Copilot Agents (via MCP)

Add to `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "devtools-capture": {
      "command": "node",
      "args": [
        "/path/to/turborepo-react-starter/packages/browser-capture/bin/copilot-devtools.js",
        "mcp-server"
      ]
    }
  }
}
```

Agents can call: `capture_snapshot`, `record_trace`, `record_performance`, `record_console`, `record_interactions`.

---

## Environment Variables

| Variable              | Default     | Description                                |
| --------------------- | ----------- | ------------------------------------------ |
| `CHROME_DEBUG_PORT`   | `9222`      | CDP port                                   |
| `CHROME_DEBUG_HOST`   | `localhost` | CDP host                                   |
| `CAPTURE_DURATION_MS` | `10000`     | Default capture duration (ms)              |
| `CAPTURE_URL`         | —           | Default URL for trace/performance commands |
| `CAPTURE_BRANCH`      | git branch  | Override branch in metadata                |
| `CHROME_HEADLESS`     | —           | Start Chrome in headless mode (CI)         |
| `CHROME_EXTRA_ARGS`   | —           | Extra Chrome flags (e.g., `--disable-gpu`) |

---

## Security & Sanitization

- **HAR response bodies**: omitted by default (`content: 'omit'`) to reduce artifact size
- **Authorization headers**: stripped in Phase 5 sanitization pass
- **Session tokens**: redacted (Authorization, Set-Cookie, X-CSRF-Token, etc.)
- **PII patterns**: emails, phone numbers, SSNs, credit cards masked
- **Whitelist filtering**: only safe headers preserved (Content-Type, User-Agent, Cache-Control, etc.)
- **Audit logging**: capture triggers logged in GitHub Actions summary + PR comments

---

## Performance & Metrics

Tracked in GitHub Actions ops report:

- **Chrome startup time**: ms to reach `/json/version` endpoint
- **Capture duration**: ms to record trace/performance/console/interactions
- **Artifact size**: bytes written to disk
- **Request count**: number of network requests captured in HAR

Targets:

- Chrome startup: < 5s (ubuntu-latest runners)
- Capture duration: < 15s per command
- Artifact size: < 50 MB per capture (HAR + trace)

---

## Future Work

- **Phase 7+**: Vitest/Jest test generation, Storybook CSF story generation, distributed tracing integration
- **DevTools extension**: browser extension for local interaction recording UI
- **Cloud storage**: upload artifacts to S3/GCS with signed URLs
- **WebSocket transport**: alternative to stdio for MCP (bi-directional streaming)

---

## Contributing

All changes to `packages/browser-capture/` should:

1. Update this CHANGELOG.md
2. Update `packages/browser-capture/README.md` and `.cursor/skills/browser-capture/SKILL.md` if adding/modifying commands
3. Add unit tests in `packages/browser-capture/__tests__/` (future)
4. Validate in CI: run `pnpm chrome:debug && node packages/browser-capture/bin/copilot-devtools.js <command>`

---

## Maintainers

- GitHub Copilot (@Copilot)
- Contributors: See git blame for CLI file history
