# @repo/browser-tools

Chrome lifecycle + UI verification utilities for `turborepo-react-starter`.

## Scope

**Verify only.** This package handles:

- Chrome remote debugging lifecycle (`chrome-debug.js`) — start, stop, status
- Lightweight DOM assertions over CDP (`browser-verify.js`)

It does **not** produce HAR files, traces, or performance artifacts. For capture/instrumentation see `@repo/browser-capture`.

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

# Read selector content
pnpm browser:read --url http://localhost:<port> --selector <css>
pnpm browser:read --url http://localhost:<port> --selector <css> --json
```

Exit codes: `0` = pass, `1` = assertion failed or error.

### URL resolution

When `--url` is omitted, the CLI resolves in order:

1. `APP_URL` env var (CI / deployed previews)
2. `http://localhost:<devPort>` from `BUNDLER` in `.env`
3. Error with bundler port table

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
- [`docs/component-validation-contract.md`](../../docs/component-validation-contract.md) — `data-testid` convention
- [`.cursor/skills/browser-validation/SKILL.md`](../../.cursor/skills/browser-validation/SKILL.md) — agent entry point
