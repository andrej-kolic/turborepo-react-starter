# @repo/browser-tools

Chrome lifecycle + UI verification utilities for `turborepo-react-starter`.

## Scope

**Verify only.** This package handles:

- Chrome remote debugging lifecycle (`chrome-debug.js`) — start, stop, status
- Lightweight DOM assertions over CDP (`browser-verify.js`) — Phase 2b

It does **not** produce HAR files, traces, or performance artifacts. For capture/instrumentation see `@repo/browser-capture`.

## Commands

```bash
pnpm chrome:debug             # Start Chrome with remote debugging on port 9222
pnpm chrome:debug:status      # Check if Chrome is running
pnpm chrome:debug:stop        # Stop Chrome
```

## Environment Variables

| Variable            | Default | Description                            |
| ------------------- | ------- | -------------------------------------- |
| `CHROME_DEBUG_PORT` | `9222`  | Remote debugging port                  |
| `CHROME_PATH`       | —       | Override Chrome executable path        |
| `CHROME_HEADLESS`   | —       | Set to `1` or `true` for headless mode |
| `CHROME_EXTRA_ARGS` | —       | Space-separated extra Chrome flags     |

## See Also

- `docs/browser-validation.md` — decision flowchart, environment scenarios
- `.cursor/skills/browser-validation/SKILL.md` — agent entry point
