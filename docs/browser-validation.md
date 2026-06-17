# Browser Validation

> **Agents:** follow the **[browser-validation skill](../.claude/skills/_browser-validation/SKILL.md)** — it has the tier A → B → C decision graph and covers 95% of cases. This document is the reference for URL derivation and the three edge-case scenarios: `--attach` with session, remote URL, and SSH tunnel. Storybook is also here because it spans multiple packages.

---

## App URL

Do not store the app URL in `.env`. It depends on which bundler is running (`BUNDLER` in `.env`).

Each bundler app declares its own port as `devPort` / `previewPort` in its `package.json`
(e.g. `apps/app-vite/package.json`). That is the single source of truth — bundler configs,
`@repo/dev-tools/config/app-port`, and browser tooling all read from it. Vite uses
`strictPort: true` so the declared port matches the listening port. Port overrides are not
supported via `PORT`; set `APP_URL` instead.

For local dev, use the URL printed by `pnpm browser:ensure-app` (`App: UP <url>`). After
`pnpm preview:app`, pass `--url` with `previewUrl` from `apps/<BUNDLER>/package.json`, or set
`APP_URL`. For deployed previews, pass the full remote URL.

### Agent bootstrap

Root `pnpm browser:*` scripts inject `APP_URL` automatically via **`dev-tools-with-app-url`**
(using `@repo/dev-tools/config/app-port`):

```bash
pnpm browser:ensure-app   # ensure dev server is up; prints "App: UP  <url>"
pnpm browser:setup        # ensure Chrome + tab (CLI tier; required_permissions: all)
pnpm browser validate --selector "[data-testid=app-header]"   # --url auto-resolved
```

Resolution order: `APP_URL` already set → use as-is; else derive `http://localhost:<devPort>`
from `apps/<BUNDLER>/package.json` via `resolveAppTargets()` / `resolveAppUrl()` in `@repo/dev-tools/config/app-port`.

Pass `--url` only to override (Storybook canvas, preview port, remote deploy).

### CLI URL resolution

When `--url` is omitted on a `pnpm browser …` subcommand: `--url` flag → `APP_URL` env var → error.
`BUNDLER` is **not** read by the CLI directly — only by the `dev-tools-with-app-url` wrapper.

### CI bootstrap

[`.github/workflows/verify-browser-smoke.yml`](../.github/workflows/verify-browser-smoke.yml) runs the same
helper path as local agents, with `BUNDLER` set per matrix job (`app-vite`, `app-webpack`, `app-esbuild`):

```bash
pnpm browser:ensure-app -- --log-file /tmp/dev-app.log
pnpm browser:setup
pnpm browser validate --selector "[data-testid=app-header]" --no-console-errors
```

`APP_URL` is derived from `BUNDLER` via `dev-tools-with-app-url` — CI does not set it explicitly.
`--log-file` captures dev-server output for CI failures (startup timeout or validate step).

---

## Edge-case scenarios

> The **[skill](../.claude/skills/_browser-validation/SKILL.md)** covers the common paths (cursor-ide-browser, chrome-devtools MCP, CLI with headless). The sections below require additional context.

### Visible Chrome with session (`--attach`)

Use this when you need to authenticate manually and then have the agent inspect the authenticated
state — without resetting cookies or session.

```bash
# 1. Ensure app is running
pnpm browser:ensure-app

# 2. Start visible Chrome if not already running (required_permissions: all)
curl -sf http://localhost:9222/json/version || pnpm chrome:debug

# 3. Open the app in the visible window
pnpm browser open --url <url>

# 4. Navigate and authenticate manually in the browser

# 5. Agent inspects the current state (does not navigate or reset session)
pnpm browser snapshot --url <url> --attach
pnpm browser validate --url <url> --selector "[data-testid=app-header]" --attach
pnpm browser read --url <url> --selector "[data-testid=app-header]" --attach

# 6. Edit components → HMR updates the tab → re-run --attach checks
```

**`--attach` rules:**

- Matches by **origin** (`scheme://host:port`) — any tab at that origin qualifies, regardless of path.
- Does **not** navigate — inspects whatever the tab currently shows.
- Requires a tab open at that origin (`pnpm browser open` or manual navigation). Errors with a hint if none is found.
- **Do not use in headless/CI/Cloud Agent** — each command should open a fresh isolated context there.

---

### Remote / deployed URL

The target app is deployed (staging, Netlify preview). Chrome still runs locally; only the
URL it navigates to is remote.

```bash
# 1. Start Chrome locally
pnpm chrome:debug

# 2. chrome-devtools MCP with the deployed URL:
# navigate_page url="https://your-preview.netlify.app"

# 3. Or assert directly from the CLI:
pnpm browser validate --url https://your-preview.netlify.app --selector body
```

`CHROME_DEBUG_HOST=localhost`, `CHROME_DEBUG_PORT=9222` — Chrome always runs locally.

---

### SSH tunnel (Chrome on remote machine)

Chrome runs on a remote machine; you run assertions locally through an SSH port-forward.

```bash
# On the remote machine — start Chrome:
pnpm chrome:debug   # listens on port 9222

# On your local machine — open the tunnel:
ssh -L 9222:localhost:9222 user@remote-host

# Now run assertions locally — connect through the tunnel:
pnpm browser validate --url http://<remote-host>:<port> --selector "[data-testid=app-header]"
```

Environment on your local machine (after tunnel is open):

```
CHROME_DEBUG_HOST=localhost
CHROME_DEBUG_PORT=9222
```

---

## Storybook validation

Storybook (`pnpm dev:ui`; port in `apps/ui-storybook/package.json`) and the live bundler app are
**different targets** — do not use `verify-browser-smoke.yml` for Storybook.

| Target                          | CI / regression                                          | Agent / local spot-check                |
| ------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| `packages/ui` in Storybook      | **Chromatic** (no workflow yet; run manually or add one) | `pnpm browser read` against canvas URLs |
| `packages/app-core` in live app | `.github/workflows/verify-browser-smoke.yml`             | `pnpm browser validate`                 |

**Scope:** `packages/app-core` components are **not** in Storybook. Assert them against the live
app, not Storybook URLs. See `docs/component-validation-contract.md`.

### Canvas URL (agents)

`pnpm browser …` does not pierce Storybook's manager iframe. Pass `--url` as
`${loadAppEndpoints('ui-storybook').devUrl}/iframe.html?id=<story-id>` from `app-port.ts` — not
`?path=/story/…`.

Story IDs: `Example/DynamicList` + `Default` → `example-dynamiclist--default`.

---

## Related files

| File                                          | Purpose                                                        |
| --------------------------------------------- | -------------------------------------------------------------- |
| `.claude/skills/_browser-validation/SKILL.md` | Agent entry point — read this first                            |
| `.claude/skills/_browser-capture/SKILL.md`    | Capture skill (HAR, traces, Web Vitals)                        |
| `AGENTS.md`                                   | Canonical agent setup, commands, service start                 |
| `packages/browser-tools/README.md`            | Full CLI reference (`browser-tools validate`, flags, env vars) |
| `docs/component-validation-contract.md`       | `data-testid` convention                                       |
| `docs/design-spec-validation.md`              | Token/layout checks via `browser eval`                         |
| `packages/browser-capture/README.md`          | Capture CLI and MCP reference                                  |
| `packages/dev-tools/config/app-port.ts`       | `loadAppEndpoints`, `resolveAppTargets`, `resolveAppUrl`       |
| `packages/dev-tools/bin/with-app-url.ts`      | `dev-tools-with-app-url` — injects `APP_URL` via `app-port.ts` |
| `packages/dev-tools/bin/print-app-port.ts`    | `dev-tools-print-app-port` — resolved port for CI shell        |
| `scripts/ensure-app.js`                       | Starts dev server if down; optional `--log-file` for CI        |
| `.github/workflows/verify-browser-smoke.yml`  | CI live-app smoke test (matrix: all bundlers)                  |
