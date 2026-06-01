# Chrome DevTools Automation — Copilot Skill

Capture Chrome DevTools artifacts (HAR, traces, performance metrics, console logs) from any page using the `automation` MCP server built into this monorepo.

## Prerequisites

Chrome must be running with remote debugging enabled:

```bash
pnpm chrome:debug          # starts Chrome on port 9222
pnpm chrome:debug:status   # check if running
pnpm chrome:debug:stop     # stop Chrome
```

The `automation` MCP server starts automatically when the agent session starts (configured in `.vscode/mcp.json`).

## Available MCP Tools

### `capture_snapshot`

Captures Chrome browser metadata and the list of open tabs. Useful as a health check or to see what pages are currently open.

**No inputs required.**

**Returns:**

- `artifactsDir` — path to the saved artifacts
- `pageCount` — number of open tabs
- `chrome` — browser version info
- `capturedAt` — ISO timestamp

**Example agent workflow:**

```
Use capture_snapshot to verify Chrome is running and see open tabs.
```

---

### `record_trace`

Navigates to a URL and records a full trace:

- `har.json` — network requests (HAR 1.2 format)
- `trace.zip` — Playwright trace with screenshots and DOM snapshots
- `console.json` — console messages and page errors
- `performance.json` — Web Vitals (LCP, CLS, INP) + 36 CDP browser metrics
- `metadata.json` — branch, commit, Chrome version

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | ✓ | Page to navigate to |
| `duration` | number | — | Seconds to observe after load (default: 10) |

**Returns:**

- `artifactsDir` — path to artifacts
- `webVitals` — `{ lcp, cls, inp }`
- `requestCount`, `consoleMessageCount`
- `files` — list of artifact file names

**Example agent workflows:**

```
Use record_trace with url="http://localhost:3000" and duration=5 to capture a full trace of the app homepage.

After record_trace completes, read performance.json from the artifactsDir to summarize Web Vitals.
```

---

### `record_performance`

Navigates to a URL and measures Web Vitals + browser metrics (lighter than a full trace — no HAR or screenshots).

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | ✓ | Page to measure |
| `duration` | number | — | Seconds to observe (default: 10) |

**Returns:**

- `artifactsDir`
- `webVitals` — `{ lcp, cls, inp }`
- `browserMetricsCount` — number of CDP browser metrics collected

**Example agent workflow:**

```
Use record_performance with url="http://localhost:3000" to get Web Vitals. If LCP > 2500ms, investigate the trace using record_trace.
```

---

### `record_console`

Listens to the console output of the **currently open** Chrome tab for a specified duration. Does not navigate; use `record_trace` if you need to navigate to a URL.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `duration` | number | — | Seconds to listen (default: 10) |

**Returns:**

- `artifactsDir`
- `consoleMessageCount`
- `url` — page that was monitored

**Example agent workflow:**

```
Open http://localhost:3000 in Chrome manually, then use record_console with duration=15 to capture console output during your interaction.
```

---

### `record_interactions`

Navigates to a URL, records user interactions (clicks, form inputs, navigation) for a specified duration, and generates a ready-to-run Playwright test file. Optionally enriches interactions with React component source locations (dev mode only, via fiber internals + source maps).

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string (URL) | ✓ | Page to navigate to and record interactions on |
| `duration` | number | — | Seconds to record (default: 10) |

**Returns:**

- `artifactsDir` — path to artifacts directory
- `interactionCount` — number of recorded interactions
- `testFile` — absolute path to the generated `generated.test.ts`
- `url` — target URL

**Artifacts:**

| File                | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `interactions.json` | Raw interaction log: `[ { type, element, value, react, timestamp } ]` |
| `generated.test.ts` | Ready-to-run Playwright test generated from the interactions          |
| `metadata.json`     | Capture metadata (timestamp, branch, commit)                          |

**Locator strategy** (in priority order):

1. `getByTestId(...)` — if `data-testid` attribute present
2. `getByLabel(...)` — if `aria-label` attribute present
3. `locator('#id')` — if element has a unique `id`
4. `getByRole('...', { name: '...' })` — role + accessible name
5. `locator('[name=...]')` — form element `name` attribute
6. `getByText(...)` — visible text content
7. `locator('tag')` — tag name fallback

**React source enrichment** (requires dev mode build with source maps):
When the target app is a React dev build, each interaction is annotated with the component name, source file, and line number. This appears as a comment in the generated test:

```typescript
await page.getByTestId('email-input').fill('user@example.com'); // LoginForm src/components/LoginForm.tsx:42
```

**Example agent workflow:**

```
1. Start Chrome with pnpm chrome:debug
2. Use record_interactions with url="http://localhost:5173" and duration=15
3. Interact with the page manually (click buttons, fill forms, navigate)
4. After recording completes, read the generated.test.ts from artifactsDir
5. Run the generated test: npx playwright test <path>/generated.test.ts
```

---

All artifacts are saved under `packages/automation/artifacts/<mode>-<timestamp>/`.

| File                | Format           | Description                                                          |
| ------------------- | ---------------- | -------------------------------------------------------------------- |
| `metadata.json`     | JSON             | Capture mode, timestamp, branch, commit, Chrome info                 |
| `version.json`      | JSON             | Chrome version (snapshot only)                                       |
| `pages.json`        | JSON             | List of open tabs (snapshot only)                                    |
| `har.json`          | HAR 1.2          | Network requests — open in Chrome DevTools or HAR viewer             |
| `trace.zip`         | Playwright trace | View with `npx playwright show-trace <path>`                         |
| `console.json`      | JSON             | `{ entries: [{ type, text, timestamp, location }] }`                 |
| `performance.json`  | JSON             | `{ webVitals, browserMetrics, runtimeMetrics }`                      |
| `interactions.json` | JSON             | `[{ type, element, value, react, timestamp }]` — raw interaction log |
| `generated.test.ts` | TypeScript       | Playwright test generated from recorded interactions                 |

## MCP Server Config

### VS Code (`.vscode/mcp.json` — already set up)

```json
{
  "servers": {
    "automation": {
      "command": "node",
      "args": ["packages/automation/bin/copilot-devtools.js", "mcp-server"],
      "env": { "CHROME_DEBUG_PORT": "9222" }
    }
  }
}
```

### Copilot CLI (`~/.copilot/mcp-config.json` — user-level, not committed)

```json
{
  "mcpServers": {
    "automation": {
      "command": "node",
      "args": [
        "/absolute/path/to/turborepo-react-starter/packages/automation/bin/copilot-devtools.js",
        "mcp-server"
      ],
      "env": { "CHROME_DEBUG_PORT": "9222" }
    }
  }
}
```

## Environment Variables

| Variable              | Default     | Description                                                      |
| --------------------- | ----------- | ---------------------------------------------------------------- |
| `CHROME_DEBUG_PORT`   | `9222`      | Chrome remote debugging port                                     |
| `CHROME_DEBUG_HOST`   | `localhost` | Chrome remote debugging host                                     |
| `CAPTURE_DURATION_MS` | `10000`     | Default capture duration in ms (fallback when no `duration` arg) |
| `CAPTURE_BRANCH`      | git branch  | Override git branch in metadata                                  |
| `CAPTURE_URL`         | —           | Default URL for CLI commands                                     |
