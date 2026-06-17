---
name: x-browser-validation
description: >-
  Verify the live app or Storybook renders correctly — assert DOM, text, and
  selectors. Use before any browser-related verification in this repo, or when
  the user mentions browser open, browser validate, browser read, browser eval,
  browser snapshot, browser screenshot, --attach, chrome-devtools MCP, DOM
  assertions, or checking rendered UI in local, CLI, remote, or Cloud Agent
  environments.
---

# Browser Validation

## Step 1 — Ensure app is running

```bash
pnpm browser:ensure-app   # required_permissions: network
```

Exits 0 when live. URL is resolved automatically from `BUNDLER` in `.env`. Note the `App: UP <url>` line in the output — you need it for Tiers A and B.

## Step 2 — Pick browser tier

### A — `cursor-ide-browser` (Cursor built-in automation)

**When:** `browser_navigate` is in your tool list. Requires Browser Automation enabled in Cursor IDE settings.

Use the URL from Step 1 output. Do not run any CLI browser commands.

---

### B — `chrome-devtools` MCP

**When:** `navigate_page` is in your tool list. Call it with the URL from Step 1 output.

If the call fails with "connection refused":

```bash
pnpm chrome:debug   # required_permissions: all
```

Retry `navigate_page`. Do not fall back to CLI.

---

### C — CLI (no MCP)

```bash
pnpm browser:setup   # required_permissions: all
```

URL is resolved automatically. Pass `--url <url>` only to override (Storybook, remote, preview port).

Output tells you the flag to use for all subsequent browser commands:

| Output                 | Flag       |
| ---------------------- | ---------- |
| `Ready. Use --attach.` | `--attach` |
| `Ready. No --attach.`  | _(omit)_   |

| Goal                   | Command                                                        |
| ---------------------- | -------------------------------------------------------------- |
| Assert selector / text | `pnpm browser validate --selector … [--contains …] [--attach]` |
| Read element content   | `pnpm browser read --selector … [--attach]`                    |
| Evaluate JS            | `pnpm browser eval --expr "() => …" [--attach]`                |
| Page snapshot          | `pnpm browser snapshot [--attach]`                             |
| Visual spot-check      | `pnpm browser screenshot --selector … [--attach]`              |

Storybook: `--url` from
`${loadAppEndpoints('ui-storybook').devUrl}/iframe.html?id=<story-id>` in `app-port.ts` — not
`?path=/story/…`.

The script detects display availability and starts Chrome accordingly — just follow the output.

For HAR / traces / Web Vitals use `devtools-capture` MCP — never mix with verify.

---

> Edge-case scenarios (`--attach`, SSH tunnel, remote URL), Storybook, and URL derivation: [`docs/browser-validation.md`](../../../docs/browser-validation.md)
