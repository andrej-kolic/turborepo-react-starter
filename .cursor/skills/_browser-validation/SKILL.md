---
name: _browser-validation
description: >-
  Verify the live app or Storybook renders correctly — assert DOM, text, and
  selectors. Use before any browser-related verification in this repo, or when
  the user mentions browser open, browser validate, browser read, browser eval,
  browser snapshot, browser screenshot, --attach, chrome-devtools MCP, DOM
  assertions, or checking rendered UI in local, CLI, remote, or Cloud Agent
  environments.
---

# Browser Validation

## Step 1 — Get URL

Resolve the URL **before** doing anything else. Do not guess or try other ports.

1. Check `.env` for `APP_URL` — if set, that is the URL. Done.
2. Otherwise read `BUNDLER` from `.env`, then read `devPort` from `apps/<BUNDLER>/package.json`. URL is `http://localhost:<devPort>`.

## Step 2 — Ensure app is running

```bash
curl -sf <url>   # required_permissions: network
```

If DOWN: run `pnpm dev:app` and wait until curl succeeds. **Do not proceed until the app is up.**

## Step 3 — Pick browser tier

### A — `cursor-ide-browser` (Cursor built-in automation)

**When:** `browser_navigate` is in your tool list. Requires Browser Automation enabled in Cursor IDE settings.

Stop here. Do not run `pnpm browser:probe` or check `$CHROME_DEBUG_PORT`.

---

### B — `chrome-devtools` MCP

**When:** `navigate_page` is in your tool list. Call it immediately — the result tells you if Chrome is running.

If the call fails with "connection refused" (Chrome not on `$CHROME_DEBUG_HOST:$CHROME_DEBUG_PORT`):

```bash
pnpm chrome:debug   # required_permissions: all
```

Retry `navigate_page`. Do not fall back to CLI.

---

### C — CLI (no MCP)

**App must be UP before running probe** (Step 2 must have succeeded).

```bash
pnpm browser:probe   # required_permissions: all
```

| Probe output                           | Action                                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------------------- |
| `Chrome: UP  visible`                  | `pnpm browser <subcommand> --url <url> --attach`                                       |
| `Chrome: UP  headless`                 | `pnpm browser <subcommand> --url <url>` (no `--attach`)                                |
| `Chrome: DOWN` → `→ Mode: --attach`    | three steps — see below                                                                |
| `Chrome: DOWN` → `→ Mode: no --attach` | `CHROME_HEADLESS=true pnpm chrome:debug`, then `pnpm browser <subcommand> --url <url>` |

**Chrome DOWN + display (→ Mode: --attach) — follow all three steps in order:**

```bash
# 1. Start Chrome
pnpm chrome:debug                              # required_permissions: all

# 2. Open ONE visible tab (required before --attach will work)
pnpm browser open --url <url>

# 3. ALL checks reuse that tab — every command gets --attach
pnpm browser <subcommand> --url <url> --attach
```

Skipping step 2 or omitting `--attach` in step 3 opens a new session per command.

**Never stop or restart Chrome that is already UP** — `pnpm chrome:debug --status` uses `kill -0`, which is blocked in Cursor's sandbox and may lie.

| Goal                   | Visible Chrome (`→ Mode: --attach`)                                  | Headless (`→ Mode: no --attach`) |
| ---------------------- | -------------------------------------------------------------------- | -------------------------------- |
| Assert selector / text | `pnpm browser validate --url … --selector … [--contains …] --attach` | same, no `--attach`              |
| Read element content   | `pnpm browser read --url … --selector … --attach`                    | same, no `--attach`              |
| Evaluate JS            | `pnpm browser eval --url … --expr "() => …" --attach`                | same, no `--attach`              |
| Page snapshot          | `pnpm browser snapshot --url … --attach`                             | same, no `--attach`              |
| Visual spot-check      | `pnpm browser screenshot --url … --selector … --attach`              | same, no `--attach`              |

Storybook canvas URL: `http://localhost:6006/iframe.html?id=<story-id>` — not `?path=/story/…`.

For HAR / traces / Web Vitals use `devtools-capture` MCP — never mix with verify.

---

> Full details and edge cases: [`docs/browser-validation.md`](../../../docs/browser-validation.md)
