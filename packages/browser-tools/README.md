# @repo/browser-tools

Chrome lifecycle + UI verification utilities for `turborepo-react-starter`.

**Canonical CLI reference** for verify-tier commands. When/why to use them (decision tree, environments, Storybook): [`docs/browser-validation.md`](../../docs/browser-validation.md).

## Scope

**Verify only.** This package handles:

- Chrome remote debugging lifecycle (`chrome-debug.js`) — start, stop, status
- Lightweight DOM assertions over CDP (`browser-verify.js`)

It does **not** produce HAR files, traces, or performance artifacts. For capture/instrumentation see `@repo/browser-capture`.

Screenshots from `browser:screenshot` are for agent visual review (stdout/file) — not CI artifact capture.

## Commands

### Chrome lifecycle

```bash
pnpm chrome:debug             # Start Chrome with remote debugging on port 9222
pnpm chrome:debug:status      # Check if Chrome is running
pnpm chrome:debug:stop        # Stop Chrome
```

### DOM verification

```bash
# Assert selector exists (--url required for agents; see URL resolution below)
pnpm browser:validate --url http://localhost:<port> --selector <css>

# Assert selector exists and contains text
pnpm browser:validate --url http://localhost:<port> --selector <css> --contains <text>

# Assert page loads without console errors (with or without --selector)
pnpm browser:validate --url http://localhost:<port> --no-console-errors
pnpm browser:validate --url http://localhost:<port> --selector <css> --no-console-errors

# Read selector content
pnpm browser:read --url http://localhost:<port> --selector <css>
pnpm browser:read --url http://localhost:<port> --selector <css> --json

# Evaluate JS in page context (design tokens, custom checks)
pnpm browser:eval --url http://localhost:<port> --expr "() => document.title" --json
pnpm browser:eval --url http://localhost:<port> --selector <css> --expr "<arrow fn>" --expect
pnpm browser:eval --url http://localhost:<port> --selector <css> --expr "<arrow fn>" --expect --no-console-errors

# Screenshot for agent visual review (not capture-tier artifacts)
pnpm browser:screenshot --url http://localhost:<port> --selector <css> --output /tmp/shot.png
pnpm browser:screenshot --url http://localhost:<port> --base64
```

Exit codes: `0` = pass, `1` = assertion failed or error.

`--no-console-errors` fails on `console.error` and uncaught page exceptions — not `console.warn`.

### URL resolution

When `--url` is omitted, the CLI resolves in order:

1. `APP_URL` env var (CI / deployed previews)
2. `http://localhost:<devPort>` from `BUNDLER` in `.env`
3. Error — pass `--url`, `APP_URL`, or `BUNDLER`

**Agents:** pass `--url` explicitly. Port comes from `devPort` in `apps/<BUNDLER>/package.json` — see [`docs/browser-validation.md`](../../docs/browser-validation.md).

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
- [`docs/design-spec-validation.md`](../../docs/design-spec-validation.md) — token/layout spec checks via `browser:eval`
- [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md) — `data-testid` convention
- [`.cursor/skills/browser-validation/SKILL.md`](../../.cursor/skills/browser-validation/SKILL.md) — agent entry point
