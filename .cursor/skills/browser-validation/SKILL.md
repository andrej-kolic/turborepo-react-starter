---
name: browser-validation
description: >-
  Verify the live app or Storybook renders correctly — assert DOM, text, and
  selectors. Use before any browser-related verification in this repo, or when
  the user mentions browser:validate, browser:read, chrome-devtools MCP, DOM
  assertions, or checking rendered UI in local, CLI, remote, or Cloud Agent
  environments.
---

# Browser Validation

Pick the **lightest** tier that answers the question. Work top to bottom; stop at the first row that fits.

| Goal                                         | Tool                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------- |
| Logic / hooks / pure functions               | `pnpm test` (Vitest + RTL)                                                  |
| Component UI in isolation                    | `pnpm dev:ui` → Storybook `:6006`                                           |
| Assert DOM / text (IDE + MCP available)      | `chrome-devtools` MCP — `navigate_page`, `evaluate_script`, `take_snapshot` |
| Assert DOM / text (Cloud Agent, SSH, no MCP) | `pnpm browser:validate`                                                     |
| HAR / trace / Web Vitals / CI artifact       | `devtools-capture` MCP → see the `browser-capture` skill                    |

> **Verify vs capture:** never use capture tools (`record_trace`, `record_performance`) for routine
> DOM/text checks, and never use verify tools when a CI artifact is needed.

## App URL

The port follows `BUNDLER` in `.env`: `app-vite` → 5173, `app-webpack` → 8080, `app-esbuild` → 8000.
Build `http://localhost:<port>`, or pass a full deployed URL. Always pass `--url` explicitly.

## CLI quick reference (no MCP — Cloud Agent / SSH / CI)

```bash
pnpm chrome:debug                                   # start Chrome on :9222 (CHROME_HEADLESS=true for CI/VM)
pnpm dev:app                                         # start the app (port follows BUNDLER)

pnpm browser:validate --url http://localhost:<port> --selector "[data-testid=app-header]"   # exit 0 pass / 1 fail
pnpm browser:validate --url http://localhost:<port> --selector "h1" --contains "Welcome"
pnpm browser:read     --url http://localhost:<port> --selector "body" --json
```

Storybook is a separate target — use **canvas URLs** (`iframe.html?id=<story-id>`), not manager URLs.

## Selector stability order

1. `[data-testid=…]` (kebab-case) → 2. `[aria-label=…]` → 3. role + accessible name → 4. CSS class (last resort).

## Full reference

- Decision flowchart, environment scenarios (local / remote / Cloud Agent / SSH tunnel), and Storybook
  validation: [`docs/browser-validation.md`](../../../docs/browser-validation.md)
- `data-testid` contract and naming: [`docs/component-validation-contract.md`](../../../docs/component-validation-contract.md)
- Artifact capture (HAR, traces, Web Vitals): the `browser-capture` skill
