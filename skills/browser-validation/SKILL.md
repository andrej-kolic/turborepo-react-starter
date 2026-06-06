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

## App URL

Port follows `BUNDLER` in `.env`. Look up the port in the **Services** table in
[`AGENTS.md`](../../AGENTS.md) (or [`docs/browser-validation.md`](../../docs/browser-validation.md#app-url)),
then build `http://localhost:<port>`. For deployed previews, pass the full URL instead.

When `--url` is omitted: CLI resolves `APP_URL` if set, else derives from `BUNDLER`.

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
pnpm dev:app               # port follows BUNDLER (see App URL above)

# 3. Assert a selector exists (exit 0 = pass, exit 1 = fail)
pnpm browser:validate --url http://localhost:<port> --selector "[data-testid=app-header]"

# 4. Assert visible text
pnpm browser:validate --url http://localhost:<port> --selector "h1" --contains "Welcome"

# 5. Read DOM content as JSON
pnpm browser:read --url http://localhost:<port> --selector "body" --json
```

> `pnpm browser:validate` and `pnpm browser:read` connect to Chrome over CDP.
> Requires Chrome running (`pnpm chrome:debug`) and the app serving at the target URL.

### Storybook (`packages/ui` only)

Storybook and the live app are different targets. **`app-core` is not in Storybook** — use
`browser:validate` against `pnpm dev:app` for integrated page regions.

| Storybook goal                              | Tool                                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| CI visual regression                        | **Chromatic** (`@chromatic-com/storybook` in `ui-storybook`) |
| Agent spot-check while Storybook is running | `pnpm browser:read` with canvas URLs                         |

Use **canvas URLs** (`iframe.html?id=…`), not manager URLs (`?path=/story/…`). The CLI does not
pierce Storybook's manager iframe.

```bash
pnpm dev:ui
pnpm chrome:debug
pnpm browser:read \
  --url "http://localhost:6006/iframe.html?id=example-dynamiclist--default" \
  --selector ".DynamicList" \
  --json
```

CI live-app smoke runs via `.github/workflows/browser-smoke.yml` — not Storybook.

---

## Capture path (artifacts)

Use the `devtools-capture` MCP server when you need:

- Network HAR
- Playwright trace
- Web Vitals (LCP, CLS, INP)
- Console logs

```
devtools-capture MCP → record_trace url="http://localhost:<port>" duration=5
devtools-capture MCP → record_performance url="http://localhost:<port>"
```

Artifacts are saved under `packages/browser-capture/artifacts/`.

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

pnpm dev:app                   # port follows BUNDLER — see App URL section
pnpm dev:ui                    # Storybook on http://localhost:6006

pnpm browser:validate --url http://localhost:<port> --selector <css>
pnpm browser:validate --url http://localhost:<port> --selector <css> --contains <text>
pnpm browser:read     --url http://localhost:<port> --selector <css> --json
```

For Cloud Agent and SSH tunnel setup, see
[docs/browser-validation.md — Scenarios 3a and 3b](../../docs/browser-validation.md#scenario-3a--cloud-agent-headless-vm-no-mcp).
