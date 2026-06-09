---
name: browser-validation
description: >-
  Verify the live app or Storybook renders correctly — assert DOM, text, and
  selectors. Use before any browser-related verification in this repo, or when
  the user mentions browser:validate, browser:read, browser:eval, browser:screenshot,
  chrome-devtools MCP, DOM
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
| Assert DOM / text (Cloud Agent, SSH, no MCP) | `pnpm browser:validate` / `browser:read`                                    |
| Design tokens / custom checks (no MCP)       | `pnpm browser:eval`                                                         |
| Visual spot-check vs design (no MCP)         | `pnpm browser:screenshot` → agent compares image                            |
| HAR / trace / Web Vitals / CI artifact       | `devtools-capture` MCP → see the `browser-capture` skill                    |

> **Verify vs capture:** never use capture tools (`record_trace`, `record_performance`) for routine
> DOM/text checks, and never use verify tools when a CI artifact is needed.

## App URL

Each app declares its port as `devPort` / `previewPort` in its `package.json`. Dev mapping:
`app-vite` → 5173, `app-webpack` → 8080, `app-esbuild` → 8000.
Build `http://localhost:<port>`, or pass a full deployed URL. **Agents:** pass `--url` explicitly;
CI may omit it and use `APP_URL` or `BUNDLER` derivation.

## CLI bootstrap (no MCP — Cloud Agent / SSH / CI)

```bash
CHROME_HEADLESS=true pnpm chrome:debug   # or pnpm chrome:debug locally
pnpm dev:app                             # port follows BUNDLER

pnpm browser:validate --url http://localhost:<port> --selector "[data-testid=app-header]"
```

Full command syntax (`browser:read`, `browser:eval`, `browser:screenshot`, flags):
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
