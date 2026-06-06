# Browser Validation

How to check that the app renders correctly and how to capture DevTools artifacts.
These are two separate concerns with separate tools — pick the right tier.

---

## Verify vs Capture

| Concept     | Industry terms                             | Role                                   | Artifacts | Tools                                          |
| ----------- | ------------------------------------------ | -------------------------------------- | --------- | ---------------------------------------------- |
| **Verify**  | drive + verify, live UI checks, assertions | Read DOM, assert text, check selector  | None      | `chrome-devtools` MCP, `pnpm browser:validate` |
| **Capture** | instrumentation, tracing, DevTools capture | HAR, traces, Web Vitals, console dumps | Yes (CI)  | `devtools-capture` MCP, `pnpm automation:*`    |

> **Rule:** Never use capture tools for routine verification. Never use verify tools when a CI
> artifact is needed.

---

## Decision Flowchart

```mermaid
flowchart TD
    A([Start: need to check the app]) --> B{Logic only?\nNo browser needed}
    B -- Yes --> C[pnpm test\nVitest + RTL]
    B -- No --> D{Component in\nisolation?}
    D -- Yes --> E[pnpm dev:ui\nStorybook :6006]
    D -- No --> F{MCP available?\nLocal / IDE session}
    F -- Yes --> G[chrome-devtools MCP\nnavigate_page · evaluate_script\ntake_snapshot]
    F -- No --> H{Cloud Agent\nor SSH?}
    H -- Yes --> I[pnpm browser:validate\n--selector … --contains …]
    H -- No --> J{Need HAR / trace\nor CI artifact?}
    J -- Yes --> K[devtools-capture MCP\nrecord_trace · record_performance]
    J -- No --> G
```

---

## Agent Decision Table

Pick the **lightest** path that answers the question. Work top to bottom and stop at the first row
that fits.

| Goal                                                     | Use                                                                         | Avoid                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| Component logic, hooks, pure functions                   | `pnpm test` (Vitest + RTL)                                                  | Any browser process                  |
| Component UI in isolation                                | `pnpm dev:ui` → Storybook `http://localhost:6006`                           | Full app unless integration matters  |
| Assert text / DOM / selector (MCP available)             | `chrome-devtools` MCP — `navigate_page`, `evaluate_script`, `take_snapshot` | `record_trace`, `record_performance` |
| Assert text / DOM / selector (no MCP — Cloud Agent, SSH) | `pnpm browser:validate --selector … --contains …`                           | Raw one-off Playwright scripts       |
| Record HAR, network, Web Vitals, trace for debugging     | `devtools-capture` MCP `record_trace` / `record_performance`                | `chrome-devtools` MCP (wrong tier)   |
| CI artifact, PR comment workflow                         | `devtools-capture` MCP + `.github/workflows/devtools.yml`                   | MCP (not available in CI)            |

---

## Environment Scenarios

### Scenario 1 — Local dev (IDE with MCP)

Chrome and the app run on the same machine as the IDE. MCP servers are available.

```bash
# 1. Start the app
pnpm dev:app                      # http://localhost:5173 (app-vite default)

# 2. Start Chrome with remote debugging
pnpm chrome:debug                 # opens Chrome on port 9222

# 3. Use MCP in your agent session
# chrome-devtools MCP → navigate_page, evaluate_script, take_snapshot
# devtools-capture MCP → record_trace, record_performance (only when you need artifacts)
```

Environment variables (`.env`):

```
APP_DEV_URL=http://localhost:5173
CHROME_DEBUG_PORT=9222
CHROME_DEBUG_HOST=localhost
```

---

### Scenario 2 — Remote / deployed URL (no local Chrome)

The app is deployed (staging, Netlify preview). No Chrome process to manage.

```bash
# No pnpm chrome:debug needed.
# Use chrome-devtools MCP with the deployed URL directly:
# navigate_page url="https://your-preview.netlify.app"

# Or capture a trace:
# devtools-capture MCP → record_trace url="https://your-preview.netlify.app"
```

Environment variables:

```
APP_VALIDATE_URL=https://your-preview.netlify.app
```

---

### Scenario 3 — SSH tunnel / Cloud Agent (no MCP, no GUI)

Running in a headless CI-like environment or a Cursor Cloud Agent where MCP is unavailable.
Use `pnpm browser:validate` which drives Chrome over CDP without requiring an MCP session.

**Step 1 — Forward the Chrome debug port over SSH (if Chrome is on a remote machine):**

```bash
# On the remote machine — start Chrome with remote debugging:
pnpm chrome:debug

# On your local machine — open an SSH tunnel to expose port 9222 locally:
ssh -L 9222:localhost:9222 user@remote-host
```

**Step 2 — Run assertions:**

```bash
# Check that a selector exists (exit 0 = pass, exit 1 = fail)
pnpm browser:validate --url "$APP_DEV_URL" --selector "[data-testid=app-header]"

# Assert visible text
pnpm browser:validate --url "$APP_DEV_URL" --selector "h1" --contains "Welcome"

# Read DOM content as JSON (for scripting / CI)
pnpm browser:read --url "$APP_DEV_URL" --selector "body" --json
```

Environment variables:

```
APP_DEV_URL=http://localhost:5173
APP_VALIDATE_URL=http://localhost:5173
CHROME_DEBUG_HOST=localhost
CHROME_DEBUG_PORT=9222
CHROME_HEADLESS=true
```

---

## Chrome Debug Commands

```bash
pnpm chrome:debug            # start Chrome with remote debugging on port 9222
pnpm chrome:debug:status     # check if Chrome is running
pnpm chrome:debug:stop       # stop Chrome

# Custom port
CHROME_DEBUG_PORT=9223 pnpm chrome:debug

# Headless mode (useful for CI or Cloud Agents)
CHROME_HEADLESS=true pnpm chrome:debug
```

---

## browser:validate / browser:read Reference

> **Note:** These commands become available in Phase 2b. Until then, use the `chrome-devtools` MCP
> for local verification or check the Storybook for component-level validation.

```bash
# Assert selector exists
pnpm browser:validate --url <url> --selector <css>

# Assert selector exists and contains text
pnpm browser:validate --url <url> --selector <css> --contains <text>

# Read selector content as JSON
pnpm browser:read --url <url> --selector <css> --json
```

Exit codes: `0` = assertion passed, `1` = assertion failed or error.

---

## Selector Stability Convention

Prefer selectors in this order (most stable → least stable):

1. `[data-testid=…]` — explicit test contract; kebab-case values
2. `[aria-label=…]` — accessible name; second choice
3. Role + accessible name (`[role=button][aria-label=…]`)
4. CSS class — last resort; documented as less stable

See `docs/component-validation-contract.md` for the full convention (added in Phase 3).

---

## Related Files

| File                                    | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `skills/browser-validation/SKILL.md`    | Agent entry point — read this first          |
| `skills/chrome-devtools/SKILL.md`       | Capture-only skill (HAR, traces, Web Vitals) |
| `docs/component-validation-contract.md` | `data-testid` convention (Phase 3)           |
| `.cursor/mcp.json`                      | MCP server configuration                     |
| `scripts/chrome-debug.js`               | Chrome lifecycle manager                     |
