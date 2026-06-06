# Browser Validation — Agent Skill

**Read this file first** before doing any browser-related verification or capture in this repo.
For full decision flowchart, environment scenarios, and command reference, see
[docs/browser-validation.md](../../docs/browser-validation.md).

---

## TL;DR — Pick the right tier

| Goal                                         | Tool                              |
| -------------------------------------------- | --------------------------------- |
| Logic / hooks / pure functions               | `pnpm test`                       |
| Component UI in isolation                    | `pnpm dev:ui` → Storybook `:6006` |
| Assert DOM / text (IDE + MCP available)      | `chrome-devtools` MCP             |
| Assert DOM / text (Cloud Agent, SSH, no MCP) | `pnpm browser:validate`           |
| HAR / trace / Web Vitals / CI artifact       | `devtools-capture` MCP            |

> **Never** use `record_trace` or `record_performance` for routine DOM checks — those are
> capture tools that produce artifacts, not verify tools.

---

## Verify path (no artifacts)

### When MCP is available (local IDE session)

Use the `chrome-devtools` MCP server. Prefer these tools:

- `navigate_page` — go to a URL
- `evaluate_script` — run JS and read the result
- `take_snapshot` — DOM snapshot for text/selector inspection

Do **not** use `record_trace` or `record_performance` for simple text or selector checks.

### When MCP is unavailable (Cloud Agent, SSH, CI)

```bash
# 1. Ensure Chrome is running with remote debugging
pnpm chrome:debug          # or: CHROME_HEADLESS=true pnpm chrome:debug

# 2. Start the app if not already running
pnpm dev:app               # http://localhost:5173

# 3. Assert a selector exists (exit 0 = pass, exit 1 = fail)
pnpm browser:validate --url "$APP_DEV_URL" --selector "[data-testid=app-header]"

# 4. Assert visible text
pnpm browser:validate --url "$APP_DEV_URL" --selector "h1" --contains "Welcome"

# 5. Read DOM content as JSON
pnpm browser:read --url "$APP_DEV_URL" --selector "body" --json
```

> `pnpm browser:validate` and `pnpm browser:read` are added in Phase 2b. Until then, use the
> `chrome-devtools` MCP for local verification.

---

## Capture path (artifacts)

Use the `devtools-capture` MCP server when you need:

- Network HAR
- Playwright trace
- Web Vitals (LCP, CLS, INP)
- Console logs

```
devtools-capture MCP → record_trace url="http://localhost:5173" duration=5
devtools-capture MCP → record_performance url="http://localhost:5173"
```

Artifacts are saved under `packages/browser-capture/artifacts/` (after Phase 4 rename; currently
`packages/automation/artifacts/`).

---

## Preferred selectors (stability order)

1. `[data-testid=…]` — explicit test contract (kebab-case)
2. `[aria-label=…]` — accessible name
3. Role + accessible name
4. CSS class — last resort

---

## Quick reference

```bash
pnpm chrome:debug              # start Chrome on port 9222
pnpm chrome:debug:status       # check if running
pnpm chrome:debug:stop         # stop Chrome

pnpm dev:app                   # start Vite dev server on http://localhost:5173
pnpm dev:ui                    # start Storybook on http://localhost:6006

pnpm browser:validate --url <url> --selector <css>
pnpm browser:validate --url <url> --selector <css> --contains <text>
pnpm browser:read     --url <url> --selector <css> --json
```

For SSH tunnel setup (remote Chrome), see
[docs/browser-validation.md — Scenario 3](../../docs/browser-validation.md#scenario-3--ssh-tunnel--cloud-agent-no-mcp-no-gui).
