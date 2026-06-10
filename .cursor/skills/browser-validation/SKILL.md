---
name: browser-validation
description: >-
  Verify the live app or Storybook renders correctly — assert DOM, text, and
  selectors. Use before any browser-related verification in this repo, or when
  the user mentions browser:open, browser:validate, browser:read, browser:eval,
  browser:snapshot, browser:screenshot, --attach, chrome-devtools MCP, DOM
  assertions, or checking rendered UI in local, CLI, remote, or Cloud Agent
  environments.
---

# Browser Validation

Pick the **lightest** tier that answers the question. Work top to bottom; stop at the first row that fits.

| Goal                                                   | Tool                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Logic / hooks / pure functions                         | `pnpm test` (Vitest + RTL)                                                    |
| Component UI in isolation                              | `pnpm dev:ui` → Storybook `:6006`                                             |
| Drive / click / multi-step UI (MCP available)          | `chrome-devtools` MCP — `navigate_page`, `evaluate_script`, `take_snapshot`   |
| Co-dev on visible Chrome (no MCP; user navigates/auth) | `pnpm browser:open` then `pnpm browser:* --attach`                            |
| Assert DOM / text (headless — Cloud Agent, SSH, CI)    | `pnpm browser:validate` / `browser:read` / `browser:snapshot` (no `--attach`) |
| Design tokens / custom checks (no MCP)                 | `pnpm browser:eval`                                                           |
| Visual spot-check vs design (no MCP)                   | `pnpm browser:screenshot` → agent compares image                              |
| HAR / trace / Web Vitals / CI artifact                 | `devtools-capture` MCP → see the `browser-capture` skill                      |

> **Verify vs capture:** never use capture tools (`record_trace`, `record_performance`) for routine
> DOM/text checks, and never use verify tools when a CI artifact is needed.

## App URL

Each app declares its port as `devPort` / `previewPort` in its `package.json`. Dev mapping:
`app-vite` → 5173, `app-webpack` → 8080, `app-esbuild` → 8000.
Build `http://localhost:<port>`, or pass a full deployed URL. **Agents:** pass `--url` explicitly;
CI may omit it and use `APP_URL` or `BUNDLER` derivation.

## CLI session modes

**Default (no `--attach`)** — headless/CI/Cloud Agent/automated checks. Each command opens a **new
isolated context**, navigates to `--url`, runs the check, closes. No cookies or auth. Do **not** use
`--attach` in headless environments.

**`--attach`** — local co-dev loop with a **visible** Chrome window. Reuses the tab already open at
that origin; does **not** navigate. Preserves auth and whatever page the user navigated to. Requires
`pnpm browser:open` (or manual navigation) first.

| Need                                                      | Use                                       |
| --------------------------------------------------------- | ----------------------------------------- |
| Fresh page at a known URL (CI, smoke, no GUI)             | `pnpm browser:validate --url …` (default) |
| User logged in / on a specific route; inspect current tab | `pnpm browser:snapshot --url … --attach`  |
| Open app in visible Chrome for the user                   | `pnpm browser:open --url …`               |

## CLI bootstrap (no MCP — Cloud Agent / SSH / CI)

```bash
CHROME_HEADLESS=true pnpm chrome:debug
pnpm dev:app                             # port follows BUNDLER

pnpm browser:validate --url http://localhost:<port> --selector "[data-testid=app-header]"
```

## CLI bootstrap (no MCP — local co-dev with visible Chrome)

```bash
pnpm dev:app
pnpm chrome:debug                        # visible Chrome (omit CHROME_HEADLESS)
pnpm browser:open --url http://localhost:<port>
# user: navigate, log in, reach the screen under test
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
