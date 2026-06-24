# @repo/browser-tools

Chrome lifecycle + UI verification CLI.

> **In turborepo-react-starter** the binaries are aliased in the root `package.json`:
> `browser-tools` → `pnpm browser`, `browser-tools-chrome` → `pnpm chrome:debug`,
> `browser-tools-setup` → `pnpm browser:setup`. Those wrappers also load `.env` and inject
> `TARGET_URL` automatically. For the agent workflow see [`AGENTS.md`](../../AGENTS.md).

## Scope

**Verify only.** This package provides three binaries:

- `browser-tools-chrome` — Chrome remote debugging lifecycle (start, stop, status)
- `browser-tools-setup` — ensure Chrome is running and a tab is open at the target URL
- `browser-tools` — DOM assertions over CDP (`validate`, `read`, `eval`, `screenshot`, `snapshot`, `open`)

It does **not** produce HAR files, traces, or performance artifacts. For capture/instrumentation see `@repo/browser-capture`.

Screenshots (`browser-tools screenshot`) are for visual review — not CI artifact capture.

`snapshot` returns a text or JSON summary of the ARIA tree (via `locator.ariaSnapshot()`) plus any `[data-testid=…]` regions.

## Commands

### Chrome lifecycle

```bash
browser-tools-chrome              # Start Chrome with remote debugging (default port 9222)
browser-tools-chrome --status     # Check if Chrome is running (probes /json/version)
browser-tools-chrome --stop       # Stop Chrome
```

### Browser setup

```bash
browser-tools-setup --url http://localhost:<port>
```

Idempotent — safe to call when Chrome is already running or a tab is already open.
Starts Chrome if not running; opens a tab at `--url` when a display is available.
`TARGET_URL` may be used instead of `--url` (see [URL resolution](#url-resolution)).

Output tells you the flag to use for all subsequent `browser-tools` commands:

| Output                 | Flag       |
| ---------------------- | ---------- |
| `Ready. Use --attach.` | `--attach` |
| `Ready. No --attach.`  | _(omit)_   |

### Navigate visible Chrome

```bash
# Open (or navigate to) a URL in the visible Chrome window.
# Reuses an existing tab at the same origin; opens a new tab otherwise.
browser-tools open --url http://localhost:<port>
```

Use this before `--attach` commands to land on a specific URL without resetting session state.

### DOM verification

```bash
# Assert selector exists
browser-tools validate --url http://localhost:<port> --selector <css>

# Assert selector exists and contains text
browser-tools validate --url http://localhost:<port> --selector <css> --contains <text>

# Assert page loads without console errors (combinable with --selector)
browser-tools validate --url http://localhost:<port> --no-console-errors
browser-tools validate --url http://localhost:<port> --selector <css> --no-console-errors

# Read selector content
browser-tools read --url http://localhost:<port> --selector <css>
browser-tools read --url http://localhost:<port> --selector <css> --json

# Structured page snapshot (ARIA tree + data-testid regions)
browser-tools snapshot --url http://localhost:<port>
browser-tools snapshot --url http://localhost:<port> --selector <css>
browser-tools snapshot --url http://localhost:<port> --json

# Evaluate JS in page context
browser-tools eval --url http://localhost:<port> --expr "() => document.title" --json
browser-tools eval --url http://localhost:<port> --selector <css> --expr "<arrow fn>" --expect
browser-tools eval --url http://localhost:<port> --selector <css> --expr "<arrow fn>" --expect --no-console-errors
# --expect: exit 1 on falsy result; prints PASS on success (or "pass": true with --json)

# Screenshot for visual review (not capture-tier artifacts)
browser-tools screenshot --url http://localhost:<port> --selector <css> --output /tmp/shot.png
browser-tools screenshot --url http://localhost:<port> --base64
```

Exit codes: `0` = pass, `1` = assertion failed or error.

`--no-console-errors` fails on `console.error` and uncaught page exceptions — not `console.warn`.

### `--attach`: operate on the existing visible tab

By default every `browser-tools` command opens a **new isolated browser context** (no cookies, no auth). Add `--attach` to reuse the tab already open in the visible Chrome window — preserving its session, cookies, and current URL.

```bash
# Snapshot whatever the visible tab currently shows (auth state intact)
browser-tools snapshot --url http://localhost:<port> --attach

# Validate a selector on the currently-open page
browser-tools validate --url http://localhost:<port> --selector <css> --attach

# Read content without navigating away
browser-tools read --url http://localhost:<port> --selector <css> --attach
```

`--attach` matches by **origin** (`scheme://host:port`) — any tab at that origin qualifies. The command does **not** navigate; it inspects whatever the tab currently shows. Errors with a hint to run `browser-tools open` first if no tab is found at that origin.

|                                      | Default (no `--attach`)           | `--attach`                                    |
| ------------------------------------ | --------------------------------- | --------------------------------------------- |
| **When to use**                      | Headless, CI, any automated check | Local co-dev — preserve authenticated session |
| **Session**                          | New isolated context per command  | Existing visible tab                          |
| **Navigation**                       | Always navigates to `--url`       | Does not navigate — inspects current page     |
| **Auth / cookies**                   | Fresh (empty)                     | Preserved                                     |
| **Needs `browser-tools open` first** | No                                | Yes (or manual navigation to that origin)     |
| **Chrome mode**                      | `CHROME_HEADLESS=true` OK         | Requires visible Chrome                       |

Commands supporting `--attach`: `validate`, `read`, `eval`, `screenshot`, `snapshot`.

## URL resolution

When `--url` is omitted:

1. `TARGET_URL` env var
2. Error — pass `--url` or set `TARGET_URL`

## Testing

Unit tests cover pure CLI helpers in `src/cli/args.js` (flag parsing, option mapping):

```bash
pnpm --filter @repo/browser-tools test
```

CDP integration (Chrome + live page) is not unit-tested here — see CI smoke:
[`.github/workflows/verify-browser-smoke.yml`](../../.github/workflows/verify-browser-smoke.yml).

## TODO

- Add session/interaction commands only if you need multi-step behavior specs (open modal → fill form → submit)
- Add an MCP server exposing the same verify commands — one implementation, CLI + IDE both covered

## Environment Variables

| Variable            | Default     | Description                            |
| ------------------- | ----------- | -------------------------------------- |
| `CHROME_DEBUG_PORT` | `9222`      | Remote debugging port                  |
| `CHROME_DEBUG_HOST` | `localhost` | Remote debugging host (CDP connect)    |
| `CHROME_PATH`       | —           | Override Chrome executable path        |
| `CHROME_HEADLESS`   | —           | Set to `1` or `true` for headless mode |
| `CHROME_EXTRA_ARGS` | —           | Space-separated extra Chrome flags     |
| `TARGET_URL`        | —           | Override URL when `--url` is omitted   |

## See Also

- [`docs/browser-validation.md`](../../docs/browser-validation.md) — edge-case scenarios, Storybook, URL derivation
- [`docs/design-spec-validation.md`](../../docs/design-spec-validation.md) — design/token checks via snapshot, screenshot, and `browser eval`
- [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md) — `data-testid` convention
- [`packages/browser-capture/README.md`](../browser-capture/README.md) — capture tier (HAR, traces, Web Vitals)
