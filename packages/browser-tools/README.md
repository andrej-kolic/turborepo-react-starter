# @repo/browser-tools

Chrome lifecycle + UI verification utilities for `turborepo-react-starter`.

**Canonical CLI reference** for verify-tier commands. When/why to use them (decision tree, environments, Storybook): [`docs/browser-validation.md`](../../docs/browser-validation.md).

## Scope

**Verify only.** This package handles:

- Chrome remote debugging lifecycle (`chrome.js`) — start, stop, status
- Browser operations over CDP (`browser.js`) — assert, read, snapshot

It does **not** produce HAR files, traces, or performance artifacts. For capture/instrumentation see `@repo/browser-capture`.

Screenshots from `pnpm browser screenshot` are for agent visual review (stdout/file) — not CI artifact capture.

`snapshot` returns a text or JSON summary of the ARIA tree (via `locator.ariaSnapshot()`) plus any `[data-testid=…]` regions — the verify-tier alternative to MCP `take_snapshot`.

## Commands

### Environment probe

```bash
pnpm browser:probe            # Detect Chrome status, app server, display — outputs recommended mode
pnpm browser:probe --json     # Same, machine-readable JSON
```

Run this before any `pnpm browser` command to get the correct session mode (`--attach` or headless).
Chrome's own `/json/version` response is the source of truth — not `pnpm chrome:debug --status` (which
uses `kill -0`, blocked in sandboxed agent shells).

### Chrome lifecycle

```bash
pnpm chrome:debug             # Start Chrome with remote debugging on port 9222
pnpm chrome:debug --status    # Check if Chrome is running (supplementary — probe is more reliable)
pnpm chrome:debug --stop      # Stop Chrome
```

### Navigate visible Chrome

```bash
# Open (or navigate to) a URL in the visible Chrome window.
# Reuses an existing tab at the same origin; opens a new tab otherwise.
pnpm browser open --url http://localhost:<port>
```

Use this before `--attach` commands, or whenever you want the agent's visible browser to land on a specific URL.

### DOM verification

```bash
# Assert selector exists (--url required for agents; see URL resolution below)
pnpm browser validate --url http://localhost:<port> --selector <css>

# Assert selector exists and contains text
pnpm browser validate --url http://localhost:<port> --selector <css> --contains <text>

# Assert page loads without console errors (with or without --selector)
pnpm browser validate --url http://localhost:<port> --no-console-errors
pnpm browser validate --url http://localhost:<port> --selector <css> --no-console-errors

# Read selector content
pnpm browser read --url http://localhost:<port> --selector <css>
pnpm browser read --url http://localhost:<port> --selector <css> --json

# Structured page snapshot (ARIA tree + data-testid regions)
pnpm browser snapshot --url http://localhost:<port>
pnpm browser snapshot --url http://localhost:<port> --selector <css>
pnpm browser snapshot --url http://localhost:<port> --json

# Evaluate JS in page context (design tokens, custom checks)
pnpm browser eval --url http://localhost:<port> --expr "() => document.title" --json
pnpm browser eval --url http://localhost:<port> --selector <css> --expr "<arrow fn>" --expect
pnpm browser eval --url http://localhost:<port> --selector <css> --expr "<arrow fn>" --expect --no-console-errors
# --expect: exit 1 on falsy result; prints PASS on success (or "pass": true with --json)

# Screenshot for agent visual review (not capture-tier artifacts)
pnpm browser screenshot --url http://localhost:<port> --selector <css> --output /tmp/shot.png
pnpm browser screenshot --url http://localhost:<port> --base64
```

Exit codes: `0` = pass, `1` = assertion failed or error.

`--no-console-errors` fails on `console.error` and uncaught page exceptions — not `console.warn`.

### `--attach`: operate on the existing visible tab

By default every `pnpm browser` command opens a **new isolated browser context** (no cookies, no auth). Add `--attach` to reuse the tab that is already open in the visible Chrome window instead — preserving its session, cookies, and current URL.

```bash
# Snapshot whatever the visible tab currently shows (auth state intact)
pnpm browser snapshot --url http://localhost:<port> --attach

# Validate a selector on the currently-open page
pnpm browser validate --url http://localhost:<port> --selector <css> --attach

# Read content without navigating away
pnpm browser read --url http://localhost:<port> --selector <css> --attach
```

`--attach` matches by **origin** (`scheme://host:port`) — any tab at that origin qualifies. The command does **not** navigate; it inspects whatever the tab currently shows. If no tab is found at that origin, the command errors with a hint to run `pnpm browser open` first.

### URL resolution

When `--url` is omitted, the CLI resolves in order:

1. `APP_URL` env var (CI / deployed previews)
2. `http://localhost:<devPort>` from `BUNDLER` in `.env`
3. Error — pass `--url`, `APP_URL`, or `BUNDLER`

**Agents:** pass `--url` explicitly. Port comes from `devPort` in `apps/<BUNDLER>/package.json` — see [`docs/browser-validation.md`](../../docs/browser-validation.md).

## Testing

Unit tests cover pure CLI helpers in `src/cli/args.js` (flag parsing, option mapping):

```bash
pnpm --filter @repo/browser-tools test
```

CDP integration (Chrome + live page) is not unit-tested here — see CI smoke:
[`.github/workflows/verify-browser-smoke.yml`](../../.github/workflows/verify-browser-smoke.yml).

## TODO

- Add session/interaction commands only if you need multi-step behavior specs (open modal → fill form → submit)
- Add a browser-tools mcp-server exposing the same 5–6 verify commands — one implementation, CLI + IDE both covered
- **`browser check-spec`** — run a YAML/JSON design spec in one command (exists, text, styles, console checks). Spec format and manual workflow today: [`docs/design-spec-validation.md`](../../docs/design-spec-validation.md). Should batch checks in a **single page session** (one navigation per spec file), not one `pnpm browser` call per row.

## Environment Variables

| Variable            | Default     | Description                                  |
| ------------------- | ----------- | -------------------------------------------- |
| `CHROME_DEBUG_PORT` | `9222`      | Remote debugging port                        |
| `CHROME_DEBUG_HOST` | `localhost` | Remote debugging host (CDP connect)          |
| `CHROME_PATH`       | —           | Override Chrome executable path              |
| `CHROME_HEADLESS`   | —           | Set to `1` or `true` for headless mode       |
| `CHROME_EXTRA_ARGS` | —           | Space-separated extra Chrome flags           |
| `BUNDLER`           | —           | Used for URL derivation when `--url` omitted |
| `APP_URL`           | —           | Override URL when `--url` omitted (CI)       |

## See Also

- [`docs/browser-validation.md`](../../docs/browser-validation.md) — decision flowchart, environment scenarios
- [`docs/design-spec-validation.md`](../../docs/design-spec-validation.md) — token/layout spec checks via `browser eval`
- [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md) — `data-testid` convention
- [`.cursor/skills/_browser-validation/SKILL.md`](../../.cursor/skills/_browser-validation/SKILL.md) — agent entry point
