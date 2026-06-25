# Playwright E2E

Browser regression tests for `@repo/app-core` using [`@playwright/test`](https://playwright.dev/docs/intro).
E2E is the **CI truth** for user-visible page regions; agent dev feedback stays in
[`browser-tools`](../packages/browser-tools/README.md) (see validation map in [`AGENTS.md`](../AGENTS.md)).

---

## Two-lane model

| Lane           | Tool             | When                                    |
| -------------- | ---------------- | --------------------------------------- |
| **Regression** | `pnpm e2e`       | CI gate, pre-merge preview check        |
| **Live dev**   | `pnpm browser …` | While coding — snapshot, validate, read |

Do not duplicate every E2E assertion in `browser validate`. Smoke (`verify-browser-smoke.yml`)
boots all three bundlers on the dev server and checks HTTP 200 only; E2E owns region assertions on
the **default bundler's preview** (`BUNDLER` in `.env` locally; `DEFAULT_BUNDLER` in CI).

---

## Local run

E2E targets a **production preview** build — not the dev server.

```bash
pnpm build:app
pnpm preview:app &          # serve preview (active bundler from BUNDLER in .env)
pnpm --filter @repo/e2e install:browsers   # first run only — install Chromium
pnpm e2e
```

Other entry points:

```bash
pnpm e2e:ui       # Playwright UI mode
pnpm e2e:headed   # headed Chromium
```

Stop preview when done (`kill %1` or close the background job).

---

## URL resolution

`packages/e2e/playwright.config.ts` sets `baseURL` via `resolveAppUrl(env, 'preview')` from
[`@repo/dev-tools/config/app-port`](../packages/dev-tools/config/app-port.ts).

1. **`TARGET_URL` set** → use as-is (local preview, deploy preview, etc.)
2. **`BUNDLER` set** → `previewPort` from `apps/<BUNDLER>/package.json`
3. else → error with actionable hint

Unset a stale `TARGET_URL` from a dev-session shell before preview/E2E — see
[`docs/browser-validation.md`](browser-validation.md#url-resolution).

CI sets `TARGET_URL` from `dev-tools-app-target resolve --preview` in
[`.github/workflows/verify-e2e.yml`](../.github/workflows/verify-e2e.yml).

---

## Bundler override (local matrix)

Default bundler comes from `BUNDLER` in `.env` (see `.env.example`; commonly `app-vite`). To test another bundler:

```bash
BUNDLER=app-webpack pnpm build:app
BUNDLER=app-webpack pnpm preview:app &
BUNDLER=app-webpack pnpm e2e
```

Or point at an already-running preview:

```bash
TARGET_URL=http://localhost:<previewPort> pnpm e2e
```

Ports are declared as `previewPort` in each app's `package.json` — the single source of truth.

---

## Locators

v1 specs assert registered page regions via `getByTestId`. Registry and naming rules:
[`docs/component-validation-contract.md`](component-validation-contract.md).

| `data-testid`    | Region         |
| ---------------- | -------------- |
| `app-header`     | Header         |
| `resource-cards` | Resource cards |
| `scroller`       | Scroller       |

For future user-flow tests (clicks, forms, navigation), prefer `getByRole` / `getByText` per [Playwright best practices](https://playwright.dev/docs/best-practices).

---

## CI

[`.github/workflows/verify-e2e.yml`](../.github/workflows/verify-e2e.yml):

1. Build app (`BUNDLER` from `vars.DEFAULT_BUNDLER`, fallback `app-vite`)
2. Start preview and wait for HTTP
3. Install Chromium
4. `pnpm e2e` with `TARGET_URL`
5. Upload Playwright report/trace artifacts on failure

Set the GitHub repo variable **`DEFAULT_BUNDLER`** (`app-vite`, `app-webpack`, or `app-esbuild`) to
choose which bundler E2E exercises in CI. Local runs use `BUNDLER` in `.env` instead.

---

## Package layout

```
packages/e2e/
  playwright.config.ts
  tests/
    app.spec.ts
```

Root scripts (`pnpm e2e`, `e2e:ui`, `e2e:headed`) delegate to `@repo/e2e` via `pnpm --filter`.
E2E is intentionally **not** in the Turbo graph.

---

## Related

- [`AGENTS.md`](../AGENTS.md) — validation map and commands
- [`docs/browser-validation.md`](browser-validation.md) — agent verify, URL edge cases
- [`docs/component-validation-contract.md`](component-validation-contract.md) — `data-testid` registry
