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

## Step 1 — Are `chrome-devtools` MCP tools callable in this session?

Check your available tools — not the environment name. MCP availability depends on what is connected in this specific session, not on whether you're "local" or "remote."

| `navigate_page` / `take_snapshot` in tool list? | Action                                                       |
| ----------------------------------------------- | ------------------------------------------------------------ |
| **Yes**                                         | Use `chrome-devtools` MCP for all DOM inspection — stop here |
| **No**                                          | Continue to Step 2                                           |

**MCP tools:** `navigate_page` · `evaluate_script` · `take_snapshot`

For HAR / traces / Web Vitals use `devtools-capture` MCP — never mix with verify.

---

## Step 2 — (No MCP) Run `browser:probe`, follow its output

```bash
# required_permissions: ["all"]
pnpm browser:probe
```

Probes what is actually running right now — Chrome (up? headless or visible?), app server, display — and tells you the mode to use. No guessing.

Example outputs:

```
Chrome:  UP    visible    port=9222     →  use --attach
Chrome:  UP    headless   port=9222     →  no --attach
Chrome:  DOWN  port=9222               →  start Chrome first (probe tells you which command)
```

If Chrome is down, the probe prints the exact start command. Run it (with `required_permissions: ["all"]`), then re-probe.

**Never stop or restart Chrome when it is already UP** — regardless of what `chrome:debug:status` says (it uses `kill -0` which is blocked in Cursor's sandbox and may lie).

> Anti-patterns:
>
> - "Error message or docs mention `CHROME_HEADLESS=true`" → only valid if the probe says `Display: NO`. Never use it just because an error suggested it.
> - "Dev server just started / wasn't responding at first" → irrelevant to session mode.
> - "`--attach` is for auth/navigation scenarios only" → use it for **any** inspection when the probe says `--attach`.

---

## Step 3 — (No MCP) Pick the lightest command

| Goal                                       | Command                                                     |
| ------------------------------------------ | ----------------------------------------------------------- |
| Assert selector exists / contains text     | `pnpm browser:validate --url … --selector … [--contains …]` |
| Read element content                       | `pnpm browser:read --url … --selector …`                    |
| Evaluate JS / design tokens                | `pnpm browser:eval --url … --expr "() => …"`                |
| Page snapshot (ARIA tree + testid regions) | `pnpm browser:snapshot --url …`                             |
| Visual spot-check                          | `pnpm browser:screenshot --url … --selector …`              |

Add `--attach` or omit it per Step 2. Never use capture tools (`record_trace`, `record_performance`) for DOM checks.

Storybook canvas URL: `http://localhost:6006/iframe.html?id=<story-id>` — not `?path=/story/…`.

---

## Reference

- Full decision flowchart, all environment scenarios, selector order, Storybook: [`docs/browser-validation.md`](../../../docs/browser-validation.md)
- CLI flags, `--attach` rules, URL resolution: [`packages/browser-tools/README.md`](../../../packages/browser-tools/README.md)
- `data-testid` contract: [`docs/component-validation-contract.md`](../../../docs/component-validation-contract.md)
- Design token checks: [`docs/design-spec-validation.md`](../../../docs/design-spec-validation.md)
- Artifact capture: [`_browser-capture/SKILL.md`](../_browser-capture/SKILL.md)
