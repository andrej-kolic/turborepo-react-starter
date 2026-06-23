# Changelog — @repo/browser-capture

Internal workspace package (`private`, not published). This file records notable CLI, MCP, and CI changes — not semver releases.

---

## History

Newest phases first.

### Phase 7 — Attach mode & ergonomics

#### `--attach` (session-preserving capture)

- CLI `--attach` on `record-trace`, `record-performance`, `record-interactions`, `record-console`
- Matches open tab by URL origin; does not navigate (preserves cookies and auth)
- Tab selection: most recently opened tab at origin (CDP order) + `bringToFront()` via `@repo/browser-tools`
- MCP: optional `attach` on `record_trace`, `record_performance`, `record_console`, `record_interactions`
- Attach-mode HAR via `HarRecorder` (network activity during capture window only)
- Documented attach caveats: capture-window HAR, browser-context `trace.zip`, `record-console` URL required

#### Root wrapper & URL resolution

- **`pnpm capture`** — root script mirrors `pnpm browser`; loads `.env`, injects `APP_URL` via `dev-tools-app-target run`
- URL when `[url]` omitted: positional → `APP_URL` → `CAPTURE_URL`

#### Modular refactor

- Renamed binary `copilot-devtools` → **`browser-capture`**
- Monolith split into `src/` modules; shared CDP via **`@repo/browser-tools`** (`connect`, `http`, `pages`, `console`, `session`)
- Vitest unit tests in `__tests__/` (args, sanitize, locator, test-generator, har-recorder)

---

### Phase 6 — Polish & operations

- CI caching: pnpm deps cached in GitHub Actions
- Monitoring: capture duration and artifact size tracked in ops reports and PR comments
- Alerts: failure notifications on `capture-devtools.yml` job failures + PR comments
- CI workflow runs full `record-trace` (5s); sanitization runs automatically in capture commands before upload
- Remote URL in CI: optional URL via `workflow_dispatch` input or first `http(s)://…` in `/capture-trace` comment body; otherwise traces local dev app

---

### Phase 5 — Security

- Artifact sanitization: strips Authorization headers, Set-Cookie, session tokens, API keys
- PII redaction: emails, phone numbers, SSNs, credit cards masked in console logs
- Whitelist-based header filtering: preserves only safe headers (Content-Type, User-Agent, etc.)
- **`sanitize-artifacts`** command and **`sanitize_artifacts`** MCP tool — manual re-sanitization (safe to re-run)

---

### Phase 4 — Interaction recording & test generation

#### New command

- **`record-interactions <url>`** — Navigate to URL, record user interactions (clicks, form fills, navigation), extract React component source locations, generate Playwright test
  - Records: click, fill, check, uncheck, selectOption, navigate events
  - Source enrichment: React fiber internals + source map resolution (dev mode only)
  - Output: `interactions.json`, `generated.test.ts`, `metadata.json`
  - Locator strategy: getByTestId > getByLabel > #id > getByRole+name > [name] > getByText > tag

#### MCP tool

- **`record_interactions`** — Inputs: `url` (required), `duration` (optional, seconds), `attach` (optional)

#### Technical

- `@jridgewell/trace-mapping` — resolve React source maps (Vite, webpack)
- `resolveSourceLocation()`, `interactionToLocator()`, `generatePlaywrightTest()`
- SPA deduplication: suppress pushState events within 1000ms of user clicks

---

### Phase 3 — MCP server

#### New command

- **`mcp-server`** — Model Context Protocol server over stdio

#### MCP tools

- `capture_snapshot` — browser metadata + open tabs list
- `record_trace` — HAR + trace + console + Web Vitals (`attach` optional)
- `record_performance` — Web Vitals + CDP browser metrics (`attach` optional)
- `record_console` — console messages (`url`, `attach` optional)
- `record_interactions` — interaction recording + Playwright test (Phase 4)
- `sanitize_artifacts` — re-sanitize artifact directory (Phase 5)

#### Configuration

- `@modelcontextprotocol/sdk` dependency
- Pre-configured in `.vscode/mcp.json` / `.cursor/mcp.json` (via rulesync)
- Skill: `.claude/skills/x-browser-capture/SKILL.md`

---

### Phase 2 — Trace & performance capture

#### New commands

- **`record-trace <url>`** — `har.json`, `trace.zip`, `console.json`, `performance.json`, `metadata.json`
- **`record-performance <url>`** — Web Vitals + CDP browser metrics (lighter than full trace)
- **`record-console`** — console output on current page for N seconds (non-navigating)

#### Technical

- Migrated to **`playwright-core`** — `chromium.connectOverCDP()`, no bundled Chromium
- Context isolation: separate `browser.newContext()` per capture
- CDP `Performance.getMetrics()` for browser metrics
- Removed manual HAR builder, CDP trace reader, network collector (~330 lines)

#### CI

- `.github/workflows/capture-devtools.yml` — pnpm cache, capture duration + artifact size in job summary

---

### Phase 1 — MVP

- **`capture-snapshot`** — Chrome metadata + open tabs list
- **`upload-artifacts`** — package `artifacts/` as tar.gz
- CLI: `packages/browser-capture/bin/browser-capture.js`
- Chrome lifecycle via `@repo/browser-tools` (`pnpm chrome:debug`; `CHROME_DEBUG_PORT`, `CHROME_HEADLESS`)
- GitHub Actions workflow (triggers, retention) — see Phase 6 for current behavior
- Dependencies: `playwright-core`, `@modelcontextprotocol/sdk` (Phase 3+), `zod` (Phase 3+)

---

## Reference

### Installation & usage

```bash
# Start Chrome (CHROME_DEBUG_PORT)
pnpm chrome:debug

# Run any command (<dev-url> from pnpm browser:ensure-app or APP_URL)
node packages/browser-capture/bin/browser-capture.js capture-snapshot
node packages/browser-capture/bin/browser-capture.js record-trace <dev-url> --duration 10
node packages/browser-capture/bin/browser-capture.js record-interactions <dev-url> --duration 15

# View Playwright traces
npx playwright show-trace packages/browser-capture/artifacts/trace-*/trace.zip
```

Prefer root wrappers when `APP_URL` is enough:

```bash
pnpm capture record-trace --duration 5
pnpm capture record-trace --attach --duration 5
```

### Copilot agents (MCP)

Add to `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "devtools-capture": {
      "command": "node",
      "args": [
        "/path/to/turborepo-react-starter/packages/browser-capture/bin/browser-capture.js",
        "mcp-server"
      ]
    }
  }
}
```

Tools: `capture_snapshot`, `record_trace`, `record_performance`, `record_console`, `record_interactions`, `sanitize_artifacts`. Navigate-based tools accept optional `attach`.

### Environment variables

| Variable              | Default     | Description                                                                    |
| --------------------- | ----------- | ------------------------------------------------------------------------------ |
| `CHROME_DEBUG_PORT`   | `9222`      | CDP port                                                                       |
| `CHROME_DEBUG_HOST`   | `localhost` | CDP host                                                                       |
| `CAPTURE_DURATION_MS` | `10000`     | Default capture duration (ms)                                                  |
| `APP_URL`             | —           | Default URL when using `pnpm capture` (injected by `dev-tools-app-target run`) |
| `CAPTURE_URL`         | —           | Fallback default URL when `APP_URL` is unset                                   |
| `CAPTURE_BRANCH`      | git branch  | Override branch in metadata                                                    |
| `CHROME_HEADLESS`     | —           | Start Chrome in headless mode (CI)                                             |
| `CHROME_EXTRA_ARGS`   | —           | Extra Chrome flags (e.g., `--disable-gpu`)                                     |

### Security & sanitization

See [`SECURITY.md`](./SECURITY.md). Summary:

- HAR response bodies omitted by default (`content: 'omit'`)
- Authorization / session headers stripped; PII masked in console and fill values
- `trace.zip` not sanitized — do not share traces of pages showing secrets on screen

### CI metrics

Tracked in GitHub Actions ops report: capture duration, artifact size. Targets: capture < 15s, artifacts < 50 MB (HAR + trace).

---

## Future work

- Vitest/Jest test generation, Storybook CSF story generation
- DevTools browser extension for local interaction recording
- Cloud artifact storage (S3/GCS signed URLs)
- WebSocket MCP transport (alternative to stdio)

---

## Contributing

Changes to `packages/browser-capture/` should:

1. Add an entry under **History** (new phase or bullets in the relevant phase)
2. Update `README.md` and `.claude/skills/x-browser-capture/SKILL.md` when commands or MCP tools change
3. Add or update tests in `__tests__/`
4. Validate locally: `pnpm browser:setup` then `pnpm capture <command>`
