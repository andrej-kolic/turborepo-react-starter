---
name: _browser-validation
description: >-
  Verify the live app or Storybook renders correctly — assert DOM, text, and
  selectors. Use before any browser-related verification in this repo, or when
  the user mentions browser:open, browser:validate, browser:read, browser:eval,
  browser:snapshot, browser:screenshot, --attach, chrome-devtools MCP, DOM
  assertions, or checking rendered UI in local, CLI, remote, or Cloud Agent
  environments.
---

# Browser Validation

## Step 1 — Choose session mode before anything else

Run `pnpm chrome:debug:status` (or check prior output in the terminal) to determine which mode to use for **every** `browser:*` command in this session:

| Chrome status                              | Where                  | Session mode                                                       |
| ------------------------------------------ | ---------------------- | ------------------------------------------------------------------ |
| Running, **not** headless                  | Local machine          | **`--attach`** on every inspect command                            |
| Running, headless (`CHROME_HEADLESS=true`) | Cloud Agent / CI / SSH | Default — no `--attach`                                            |
| Not running                                | Any                    | Start Chrome first (see bootstrap below), then re-apply this table |

> **Rule:** Chrome running + not headless + local machine = `--attach` on all `browser:*` commands.
>
> **Anti-patterns that must NOT change the mode:**
>
> - "I just started `pnpm dev:app`" — server startup is irrelevant to session mode.
> - "The app wasn't responding at first" — a transient server state is not a signal to use default mode.
> - "`--attach` is for auth/navigation scenarios" — it is for **any** local inspection (read, eval, validate, snapshot, screenshot) when Chrome is running visibly.

If Chrome is running visibly locally, **always** add `--attach`:

```bash
pnpm browser:snapshot   --url http://localhost:<port> --attach
pnpm browser:validate   --url http://localhost:<port> --selector "[data-testid=…]" --attach
pnpm browser:eval       --url http://localhost:<port> --expr "() => …" --attach
pnpm browser:read       --url http://localhost:<port> --selector "…" --attach
pnpm browser:screenshot --url http://localhost:<port> --attach
```

---

## Step 2 — Pick the lightest tier that answers the question

Work top to bottom; stop at the first row that fits.

| Goal                                                        | Tool                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Logic / hooks / pure functions                              | `pnpm test` (Vitest + RTL)                                                    |
| Component UI in isolation                                   | `pnpm dev:ui` → Storybook `:6006`                                             |
| Drive / click / multi-step UI (MCP available)               | `chrome-devtools` MCP — `navigate_page`, `evaluate_script`, `take_snapshot`   |
| Any inspection — local, Chrome running visibly (no MCP)     | `pnpm browser:* --attach` (mode set in Step 1)                                |
| Any inspection — headless / Cloud Agent / SSH / CI (no MCP) | `pnpm browser:validate` / `browser:read` / `browser:snapshot` (no `--attach`) |
| Design tokens / custom checks (no MCP)                      | `pnpm browser:eval` (session mode from Step 1 applies)                        |
| Visual spot-check vs design (no MCP)                        | `pnpm browser:screenshot` (session mode from Step 1 applies)                  |
| HAR / trace / Web Vitals / CI artifact                      | `devtools-capture` MCP → see the `browser-capture` skill                      |

> **Verify vs capture:** never use capture tools (`record_trace`, `record_performance`) for routine
> DOM/text checks, and never use verify tools when a CI artifact is needed.

## App URL

Each app declares its port as `devPort` / `previewPort` in its `package.json`. Dev mapping:
`app-vite` → 5173, `app-webpack` → 8080, `app-esbuild` → 8000.
Build `http://localhost:<port>`, or pass a full deployed URL. **Agents:** pass `--url` explicitly;
CI may omit it and use `APP_URL` or `BUNDLER` derivation.

## CLI bootstrap (no MCP — Cloud Agent / SSH / CI)

```bash
CHROME_HEADLESS=true pnpm chrome:debug
pnpm dev:app                             # port follows BUNDLER

pnpm browser:validate --url http://localhost:<port> --selector "[data-testid=app-header]"
```

## CLI bootstrap (no MCP — local co-dev with visible Chrome)

```bash
pnpm chrome:debug:status                 # already running? → skip next line
pnpm chrome:debug                        # visible Chrome — do NOT set CHROME_HEADLESS
pnpm dev:app                             # already running? → skip
pnpm browser:open --url http://localhost:<port>   # puts the tab in Chrome
# user: navigate, log in, reach the screen under test
# → from here every browser:* command gets --attach
pnpm browser:snapshot --url http://localhost:<port> --attach
pnpm browser:validate --url http://localhost:<port> --selector "[data-testid=…]" --attach
# agent edits code → HMR updates the same tab → re-run --attach checks
```

Full command syntax (`browser:open`, `browser:read`, `browser:eval`, `browser:snapshot`, `--attach`):
[`packages/browser-tools/README.md`](../../../packages/browser-tools/README.md).

Storybook is a separate target — use **canvas URLs** (`iframe.html?id=<story-id>`), not manager URLs.

## Selector stability order

1. `[data-testid=…]` (kebab-case) → 2. `[aria-label=…]` → 3. role + accessible name → 4. CSS class (last resort).

## Full reference

- Decision flowchart, environment scenarios (local / remote / Cloud Agent / SSH tunnel), and Storybook
  validation: [`docs/browser-validation.md`](../../../docs/browser-validation.md)
- `data-testid` contract and naming: [`docs/component-validation-contract.md`](../../../docs/component-validation-contract.md)
- Verify CLI reference: [`packages/browser-tools/README.md`](../../../packages/browser-tools/README.md)
- Design token / Figma-adjacent checks: [`docs/design-spec-validation.md`](../../../docs/design-spec-validation.md)
- Artifact capture (HAR, traces, Web Vitals): the `browser-capture` skill
